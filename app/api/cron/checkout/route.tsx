import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We use the Supabase Admin client (Service Role Key) here 
// because a cron job runs in the background and isn't "logged in" as a specific user.
// This allows it to bypass Row Level Security to update all companies at once.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    // SECURITY: If you deploy to Vercel, this ensures only Vercel's Cron scheduler can trigger this URL
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Determine the cutoff time (Start of today)
    // Anyone who checked in BEFORE today will be swept out.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 2. Perform the sweep
    const { data, error } = await supabaseAdmin
      .from("visitors")
      .update({ 
        status: "auto_checked_out",
        checked_out_at: new Date().toISOString()
      })
      .eq("status", "checked_in")
      .lt("created_at", startOfToday.toISOString())
      .select();

    if (error) throw error;

    console.log(`Auto-checkout complete. Swept ${data?.length || 0} visitors.`);
    
    return NextResponse.json({ 
      success: true, 
      swept_count: data?.length || 0,
      message: "Midnight auto-checkout complete" 
    });

  } catch (error: any) {
    console.error("Cron Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to run auto-checkout", details: error.message }, 
      { status: 500 }
    );
  }
}