import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId");
    const merchantReference = searchParams.get("OrderMerchantReference");

    if (!orderTrackingId || !merchantReference) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const statusData = await getTransactionStatus(orderTrackingId);

    if (statusData.status_code === 1) { 
      const actualCompanyId = merchantReference.substring(0, 36);
      const amountPaid = statusData.amount || 5000;
      const monthsToAdd = Math.max(1, Math.floor(amountPaid / 5000));

      // SMART CHECK: Check if this exact transaction was already logged to prevent duplicates!
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('tracking_id', orderTrackingId)
        .single();

      // If it doesn't exist yet, we unlock the account and save the receipt
      if (!existingTx) {
        const { data: company, error: fetchError } = await supabaseAdmin
          .from('companies')
          .select('subscription_ends_at, amount_paid')
          .eq('id', actualCompanyId)
          .single();

        if (fetchError) {
          return NextResponse.json({ error: `Database fetch failed: ${fetchError.message}` }, { status: 500 });
        }

        let newExpiryDate = new Date();
        if (company?.subscription_ends_at && new Date(company.subscription_ends_at) > new Date()) {
          newExpiryDate = new Date(company.subscription_ends_at);
        }
        newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

        // 1. Force the database update
        await supabaseAdmin
          .from('companies')
          .update({ 
             subscription_status: 'paid', 
             is_locked: false, 
             amount_paid: (company?.amount_paid || 0) + amountPaid, 
             subscription_ends_at: newExpiryDate.toISOString(),
          })
          .eq('id', actualCompanyId);

        // 2. LOG THE TRANSACTION HISTORY
        await supabaseAdmin
          .from('transactions')
          .insert({
            company_id: actualCompanyId,
            amount: amountPaid,
            tracking_id: orderTrackingId,
            status: 'Completed'
          });
      }

      return NextResponse.json({ success: true, status: "completed" });
    }

    return NextResponse.json({ success: false, status: statusData.payment_status_description });
    
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Server Error" }, { status: 500 });
  }
}