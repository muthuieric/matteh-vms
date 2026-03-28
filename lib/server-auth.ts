import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks if a company is allowed to access the system.
 * Returns { allowed: true } if valid, or { allowed: false, error: string, status: number } if blocked.
 */
export async function verifyCompanyAccess(supabaseAdmin: SupabaseClient, companyId: string) {
  if (!companyId) {
    return { allowed: false, error: "Company ID is required", status: 400 };
  }

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("is_locked, subscription_ends_at")
    .eq("id", companyId)
    .single();

  if (error || !company) {
    return { allowed: false, error: "Company not found", status: 404 };
  }

  if (company.is_locked) {
    return { allowed: false, error: "Company account is suspended due to unpaid balance or policy violation.", status: 403 };
  }

  if (company.subscription_ends_at) {
    const isExpired = new Date(company.subscription_ends_at) < new Date();
    if (isExpired) {
      return { allowed: false, error: "Company subscription has expired.", status: 403 };
    }
  }

  return { allowed: true };
}