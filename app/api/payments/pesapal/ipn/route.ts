import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderTrackingId = searchParams.get("OrderTrackingId");
    const merchantReference = searchParams.get("OrderMerchantReference");

    if (!orderTrackingId || !merchantReference) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const statusData = await getTransactionStatus(orderTrackingId);

    if (statusData.status_code === 1) {
      // FIX: Slice the first 36 characters to get the exact Supabase companyId
      const actualCompanyId = merchantReference.substring(0, 36);

      await supabase
        .from('companies')
        .update({ 
           subscription_status: 'paid', 
           is_locked: false, 
           amount_paid: statusData.amount || 5000 
        })
        .eq('id', actualCompanyId);
        
      console.log(`Payment successful for company: ${actualCompanyId}`);
    }

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