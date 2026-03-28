import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { companyId, otp } = await request.json();

    if (!companyId || !otp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Securely connect using the Admin key (bypasses RLS safely on the server)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find the active visitor record using the OTP code
    const { data: visitors, error: fetchError } = await supabaseAdmin
      .from("visitors")
      .select("*")
      .eq("company_id", companyId)
      .eq("otp_code", otp.trim())
      .eq("status", "checked_in")
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!visitors || visitors.length === 0) {
      return NextResponse.json({ error: "Invalid code or you are already checked out." }, { status: 404 });
    }

    const activeVisitor = visitors[0];

    // 2. Check them out by updating status AND the checkout timestamp
    const { error: updateError } = await supabaseAdmin
      .from("visitors")
      .update({
        status: "checked_out",
        checked_out_at: new Date().toISOString()
      })
      .eq("id", activeVisitor.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Checked out successfully" });

  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: "Server Error during checkout" }, { status: 500 });
  }
}