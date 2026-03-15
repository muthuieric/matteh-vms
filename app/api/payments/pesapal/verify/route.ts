import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { orderTrackingId, merchantReference } = await req.json();

    if (!orderTrackingId || !merchantReference) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // FIX: Since we know the Supabase UUID is EXACTLY 36 characters long, 
    // we just slice the first 36 characters off the string!
    const actualCompanyId = merchantReference.substring(0, 36);

    const statusData = await getTransactionStatus(orderTrackingId);

    if (statusData.status_code === 1) {
      const { error } = await supabase
        .from('companies')
        .update({ 
           subscription_status: 'paid', 
           is_locked: false, 
           amount_paid: statusData.amount || 5000 
        })
        .eq('id', actualCompanyId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: "Payment not completed yet." });
    }

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}