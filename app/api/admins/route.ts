import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use the Service Role Key to bypass RLS and create accounts securely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName, companyId } = await request.json();

    if (!email || !password || !fullName || !companyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Link them to the specific company with the 'company_admin' role!
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        company_id: companyId,
        role: "company_admin",
        full_name: fullName,
      });

    if (profileError) {
      // Rollback if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({ success: true, message: "Company Admin account created successfully." });

  } catch (error: any) {
    console.error("Admin Creation Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to create admin account" }, 
      { status: 500 }
    );
  }
}