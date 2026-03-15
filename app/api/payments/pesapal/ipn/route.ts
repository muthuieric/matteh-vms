import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { createClient } from "@supabase/supabase-js"; // Import the client creator

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId");
    const merchantReference = searchParams.get("OrderMerchantReference");

    if (!orderTrackingId || !merchantReference) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Create a "Superadmin" Supabase client that bypasses RLS security blocks
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypasses database security!
    );

    const statusData = await getTransactionStatus(orderTrackingId);

    if (statusData.status_code === 1) { // 1 = Completed
      const actualCompanyId = merchantReference.substring(0, 36);
      const amountPaid = statusData.amount || 5000;
      
      const monthsToAdd = Math.max(1, Math.floor(amountPaid / 5000));

      // SMART CHECK: Prevent double-logging if the success page already verified it!
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('tracking_id', orderTrackingId)
        .single();

      if (!existingTx) {
        // Fetch current subscription expiry to add time properly
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('subscription_ends_at, amount_paid')
          .eq('id', actualCompanyId)
          .single();

        let newExpiryDate = new Date();
        
        if (company?.subscription_ends_at && new Date(company.subscription_ends_at) > new Date()) {
          newExpiryDate = new Date(company.subscription_ends_at);
        }
        
        newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

        // Update the company record
        await supabaseAdmin
          .from('companies')
          .update({ 
             subscription_status: 'paid', 
             is_locked: false, 
             amount_paid: (company?.amount_paid || 0) + amountPaid, 
             subscription_ends_at: newExpiryDate.toISOString(),
          })
          .eq('id', actualCompanyId);
          
        // LOG THE TRANSACTION HISTORY
        await supabaseAdmin
          .from('transactions')
          .insert({
            company_id: actualCompanyId,
            amount: amountPaid,
            tracking_id: orderTrackingId,
            status: 'Completed'
          });

        console.log(`[IPN] Payment successful for company: ${actualCompanyId}. Extended by ${monthsToAdd} months.`);
      } else {
         console.log(`[IPN] Transaction ${orderTrackingId} already processed by verification route. Skipping.`);
      }
    }

    // Always return a 200 status back to PesaPal so they know we received the IPN
    return NextResponse.json({
      orderNotificationType: "IPN",
      orderTrackingId: orderTrackingId,
      orderMerchantReference: merchantReference,
      status: 200
    });

  } catch (error) {
    console.error("IPN Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}