import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId");
    const merchantReference = searchParams.get("OrderMerchantReference");

    if (!orderTrackingId || !merchantReference) {
      return NextResponse.json({ success: false, error: "Missing tracking ID or reference" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const statusData = await getTransactionStatus(orderTrackingId);

    if (statusData.status_code === 1) { // 1 = Completed
      const actualCompanyId = merchantReference.substring(0, 36);
      const amountPaid = statusData.amount || 5000;
      const monthsToAdd = Math.max(1, Math.floor(amountPaid / 5000));

      // 1. Try to INSERT the transaction FIRST to prevent race conditions.
      // This uses the database's UNIQUE lock to guarantee only one script succeeds!
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          company_id: actualCompanyId,
          amount: amountPaid,
          tracking_id: orderTrackingId,
          status: 'Completed'
        });

      // 2. If NO error, we won the race! We are the first script to process this payment.
      if (!txError) {
        const { data: company, error: fetchError } = await supabaseAdmin
          .from('companies')
          .select('subscription_ends_at, amount_paid')
          .eq('id', actualCompanyId)
          .single();

        if (fetchError) {
          console.error("[Verify] Database fetch failed:", fetchError);
        } else {
          let newExpiryDate = new Date();
          if (company?.subscription_ends_at && new Date(company.subscription_ends_at) > new Date()) {
            newExpiryDate = new Date(company.subscription_ends_at);
          }
          newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

          // Safely update the company now that we know we are the only ones doing it
          await supabaseAdmin
            .from('companies')
            .update({ 
               subscription_status: 'paid', 
               is_locked: false, 
               amount_paid: (company?.amount_paid || 0) + amountPaid, 
               subscription_ends_at: newExpiryDate.toISOString(),
            })
            .eq('id', actualCompanyId);
            
          console.log(`[Verify] Processed payment successfully for: ${actualCompanyId}`);
        }
      } 
      // 3. '23505' is the database error code for "Unique Violation" (Already Exists)
      else if (txError.code === '23505') {
        console.log(`[Verify] Transaction ${orderTrackingId} already processed by IPN route. Safely skipping company update.`);
      } else {
        console.error("[Verify] DB Insert Error:", txError);
      }

      // Always return success to the frontend if the payment was completed on PesaPal
      return NextResponse.json({ success: true, status: "COMPLETED" });
    }

    return NextResponse.json({ success: false, status: statusData.payment_status_description });
    
  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Server Error" }, { status: 500 });
  }
}