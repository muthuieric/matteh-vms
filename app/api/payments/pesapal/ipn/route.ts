import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId");
    
    // We read this to satisfy Pesapal's required response format, 
    // BUT WE WILL NOT TRUST IT for updating the database (Credit Hijacking Prevention).
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

    // ============================================================================
    // SCENARIO 1: SUCCESSFUL PAYMENT
    // ============================================================================
    if (statusData.status_code === 1) { // 1 = Completed
      
      const secureMerchantReference = statusData.merchant_reference;
      
      if (!secureMerchantReference) {
        console.error(`[IPN] Missing secure merchant reference for tracking ID: ${orderTrackingId}`);
        return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
      }

      const actualCompanyId = secureMerchantReference.substring(0, 36);
      const amountPaid = Number(statusData.amount);
      
      if (isNaN(amountPaid) || amountPaid <= 0) {
        console.error(`[IPN] Critical: Invalid amount (${statusData.amount}) received.`);
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      // Calculate exactly how many full months they paid for.
      // CHANGED FROM 5000 TO 10 FOR TESTING
      const monthsToAdd = Math.floor(amountPaid / 10);

      // Prevent Partial Payment Exploit
      if (monthsToAdd < 1) {
        return NextResponse.json({ error: "Insufficient payment amount" }, { status: 400 });
      }

      // Try to INSERT the transaction FIRST using the database's UNIQUE constraint 
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          company_id: actualCompanyId,
          amount: amountPaid,
          tracking_id: orderTrackingId,
          status: 'Completed'
        });

      // If NO error, we are the first script to process this payment.
      if (!txError) {
        const { data: company, error: fetchError } = await supabaseAdmin
          .from('companies')
          .select('subscription_ends_at, amount_paid')
          .eq('id', actualCompanyId)
          .single();

        if (fetchError || !company) {
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
          
        if (updateError) {
          // Rollback transaction if company update fails
          await supabaseAdmin.from('transactions').delete().eq('tracking_id', orderTrackingId);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }
        
        console.log(`[IPN] Processed payment successfully for: ${actualCompanyId}`);
      } 
      else if (txError.code === '23505') {
        console.log(`[IPN] Transaction ${orderTrackingId} already processed. Skipping.`);
      } else {
        console.error("[IPN] DB Insert Error:", txError);
      }
    } 
    // ============================================================================
    // SCENARIO 2: REVERSED / REFUNDED PAYMENT (CHARGEBACK)
    // ============================================================================
    else if (statusData.status_code === 3) { // 3 = Reversed in Pesapal
      
      const secureMerchantReference = statusData.merchant_reference;
      if (!secureMerchantReference) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
      
      const actualCompanyId = secureMerchantReference.substring(0, 36);
      const amountReversed = Number(statusData.amount);
      
      // CHANGED FROM 5000 TO 10 FOR TESTING
      const monthsToRevoke = Math.floor(amountReversed / 10);

      if (monthsToRevoke >= 1) {
        // 1. Check if we actually processed this as 'Completed' before
        const { data: existingTx } = await supabaseAdmin
          .from('transactions')
          .select('status')
          .eq('tracking_id', orderTrackingId)
          .single();

        if (existingTx && existingTx.status === 'Completed') {
          console.warn(`[IPN] Payment REVERSED for tracking ID: ${orderTrackingId}. Revoking access.`);

          // 2. Mark the transaction as Reversed
          await supabaseAdmin
            .from('transactions')
            .update({ status: 'Reversed' })
            .eq('tracking_id', orderTrackingId);

          // 3. Fetch current company status
          const { data: company } = await supabaseAdmin
            .from('companies')
            .select('subscription_ends_at, amount_paid')
            .eq('id', actualCompanyId)
            .single();

          if (company && company.subscription_ends_at) {
            // Subtract the months
            let adjustedExpiry = new Date(company.subscription_ends_at);
            adjustedExpiry.setMonth(adjustedExpiry.getMonth() - monthsToRevoke);

            // If the new expiry date is in the past, lock the account
            const isNowExpired = adjustedExpiry < new Date();

            await supabaseAdmin
              .from('companies')
              .update({ 
                 is_locked: isNowExpired,
                 subscription_status: isNowExpired ? 'unpaid' : 'paid',
                 amount_paid: Math.max(0, (company.amount_paid || 0) - amountReversed),
                 subscription_ends_at: adjustedExpiry.toISOString(),
              })
              .eq('id', actualCompanyId);
              
            console.log(`[IPN] Successfully revoked ${monthsToRevoke} month(s) for company ${actualCompanyId}`);
          }
        }
      }
    }

    // Always respond 200 to Pesapal with the exact format they require 
    return NextResponse.json({
      orderNotificationType: "IPN",
      orderTrackingId: orderTrackingId,
      orderMerchantReference: urlMerchantReference, 
      status: 200
    });

  } catch (error) {
    console.error("IPN Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}