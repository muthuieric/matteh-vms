import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId");
    
    // We still read this to satisfy Pesapal's required response format, 
    // BUT WE WILL NOT TRUST IT for updating the database.
    const urlMerchantReference = searchParams.get("OrderMerchantReference");

    if (!orderTrackingId || !urlMerchantReference) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch the secure, tamper-proof transaction data directly from Pesapal
    const statusData = await getTransactionStatus(orderTrackingId);

    if (statusData.status_code === 1) { // 1 = Completed
      
      // --- SECURITY FIX: PREVENT CREDIT HIJACKING ---
      // ONLY trust the merchant reference returned by Pesapal's secure server, 
      // NOT the one passed in the public webhook URL.
      const secureMerchantReference = statusData.merchant_reference;
      
      if (!secureMerchantReference) {
        console.error(`[IPN] Missing secure merchant reference for tracking ID: ${orderTrackingId}`);
        return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
      }

      const actualCompanyId = secureMerchantReference.substring(0, 36);
      // ----------------------------------------------

      // Strictly parse the amount and ensure it is a valid, positive number.
      const amountPaid = Number(statusData.amount);
      
      if (isNaN(amountPaid) || amountPaid <= 0) {
        console.error(`[IPN] Critical: Invalid amount (${statusData.amount}) received for tracking ID: ${orderTrackingId}`);
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      // --- SECURITY FIX: PREVENT PARTIAL PAYMENT EXPLOIT ---
      // Calculate exactly how many full months they paid for.
      const monthsToAdd = Math.floor(amountPaid / 5000);

      // If they paid less than 5000 KES, they don't even get 1 month. Block the upgrade.
      if (monthsToAdd < 1) {
        console.error(`[IPN] Insufficient funds: ${amountPaid} paid, but 5000 minimum required. Tracking ID: ${orderTrackingId}`);
        return NextResponse.json({ error: "Insufficient payment amount" }, { status: 400 });
      }
      // -----------------------------------------------------

      // Try to INSERT the transaction FIRST using the database's UNIQUE constraint 
      // to guarantee idempotency (preventing double-crediting if IPN fires twice).
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          company_id: actualCompanyId,
          amount: amountPaid,
          tracking_id: orderTrackingId,
          status: 'Completed'
        });

      // If NO error, we won the race! We are the first script to process this payment.
      if (!txError) {
        const { data: company, error: fetchError } = await supabaseAdmin
          .from('companies')
          .select('subscription_ends_at, amount_paid')
          .eq('id', actualCompanyId)
          .single();

        // --- RESILIENCE FIX 1: Missing Company Guard ---
        if (fetchError || !company) {
          console.error(`[IPN] Company not found for ID: ${actualCompanyId}. Rolling back.`);
          await supabaseAdmin.from('transactions').delete().eq('tracking_id', orderTrackingId);
          return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        let newExpiryDate = new Date();
        if (company.subscription_ends_at && new Date(company.subscription_ends_at) > new Date()) {
          newExpiryDate = new Date(company.subscription_ends_at);
        }
        newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

        // Safely update the company
        const { error: updateError } = await supabaseAdmin
          .from('companies')
          .update({ 
             subscription_status: 'paid', 
             is_locked: false, 
             amount_paid: (company.amount_paid || 0) + amountPaid, 
             subscription_ends_at: newExpiryDate.toISOString(),
          })
          .eq('id', actualCompanyId);
          
        // --- RESILIENCE FIX 2: Rollback on Update Failure ---
        if (updateError) {
          console.error(`[IPN] Failed to credit company ${actualCompanyId}. Rolling back.`, updateError);
          // Delete the transaction so Pesapal's automatic retry will trigger the whole process again
          await supabaseAdmin.from('transactions').delete().eq('tracking_id', orderTrackingId);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }
        // ---------------------------------------------------

        console.log(`[IPN] Processed payment successfully for: ${actualCompanyId}. Added ${monthsToAdd} month(s).`);
      } 
      // '23505' is the database error code for "Unique Violation" (Already Exists)
      else if (txError.code === '23505') {
        console.log(`[IPN] Transaction ${orderTrackingId} already processed. Skipping.`);
      } else {
        console.error("[IPN] DB Insert Error:", txError);
      }
    }

    // Always respond 200 to Pesapal with the exact format they require 
    return NextResponse.json({
      orderNotificationType: "IPN",
      orderTrackingId: orderTrackingId,
      orderMerchantReference: urlMerchantReference, // Pesapal expects what they sent
      status: 200
    });

  } catch (error) {
    console.error("IPN Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}