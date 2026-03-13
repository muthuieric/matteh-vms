import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We use the Service Role Key so the Admin can create other users 
// without getting logged out of their own session.
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

    // 1. Create the user in the Supabase Auth system
    // email_confirm: true bypasses the need for them to click a verification email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Link their new Auth ID to their specific Building/Company in the profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        company_id: companyId,
        role: "guard",
        full_name: fullName,
      });

    if (profileError) {
      // Rollback: If profile creation fails, delete the auth user so we don't have broken data
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({ success: true, message: "Guard account created successfully." });

  } catch (error: any) {
    console.error("Guard Creation Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to create guard account" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guardId = searchParams.get("id");

    if (!guardId) {
      return NextResponse.json({ error: "Guard ID is required" }, { status: 400 });
    }

    // Deleting the user from the main Auth system automatically cascades 
    // and deletes their profile from the profiles table too!
    const { error } = await supabaseAdmin.auth.admin.deleteUser(guardId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Guard account permanently deleted." });

  } catch (error: any) {
    console.error("Guard Deletion Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to delete guard account" }, 
      { status: 500 }
    );
  }
}