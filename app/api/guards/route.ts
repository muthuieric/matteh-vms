import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// The Service Role is powerful, so we keep it secured behind strict checks below
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * SECURITY HELPER: Verifies the caller is a company-admin and belongs to the correct company
 */
async function verifyAdminCaller(request: Request, targetCompanyId?: string) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return { error: "Missing Authorization header", status: 401 };

  const token = authHeader.replace('Bearer ', '');
  const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // 1. Validate the token
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) return { error: "Invalid token", status: 401 };

  // 2. Fetch the caller's profile to check their role and company
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'company-admin' && profile.role !== 'superadmin')) {
    return { error: "Forbidden: You do not have admin privileges", status: 403 };
  }

  // 3. Ensure they are only modifying their OWN company (unless they are superadmin)
  if (targetCompanyId && profile.role !== 'superadmin' && profile.company_id !== targetCompanyId) {
    return { error: "Forbidden: You cannot modify another company's data", status: 403 };
  }

  return { user, profile };
}


export async function POST(request: Request) {
  try {
    const { email, password, fullName, companyId } = await request.json();

    if (!email || !password || !fullName || !companyId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // --- SECURITY FIX: Prevent IDOR (Creating guards for other companies) ---
    const authCheck = await verifyAdminCaller(request, companyId);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    // ------------------------------------------------------------------------

    // 1. Create the user in the Supabase Auth system
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Link their new Auth ID to their specific Building/Company
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        company_id: companyId,
        role: "guard",
        full_name: fullName,
      });

    if (profileError) {
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

    // --- SECURITY FIX: Prevent IDOR (Deleting guards from other companies) ---
    // First, find out which company this guard belongs to
    const { data: guardProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', guardId)
      .single();

    if (!guardProfile) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 });
    }

    // Now verify the caller actually owns that company
    const authCheck = await verifyAdminCaller(request, guardProfile.company_id);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    // ------------------------------------------------------------------------

    // Delete the user from the main Auth system
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