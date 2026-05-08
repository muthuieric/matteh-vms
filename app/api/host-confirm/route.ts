import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

// Use the Service Role Key to bypass RLS securely on the backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { visitorId, companyId } = await request.json();

    if (!visitorId || !companyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update ONLY the new host_confirmed column we added.
    // We intentionally DO NOT update 'status' here to avoid the 500 enum error.
    const { error } = await supabaseAdmin
      .from("visitors")
      .update({ 
        host_confirmed: true 
      })
      .eq("id", visitorId)
      .eq("company_id", companyId);

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Host Confirm API Error:", error);
    return NextResponse.json({ error: "Failed to confirm visitor." }, { status: 500 });
  }
}