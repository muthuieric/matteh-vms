import { NextResponse } from "next/server";
import { submitOrder } from "@/lib/pesapal"; 
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[PESAPAL INITIATE] Received body:", body);

    // We IGNORE body.amount entirely for security.
    const companyId = body.companyId || body.company_id || body.id || body.company;

    if (!companyId) {
      console.error("[PESAPAL INITIATE] Missing companyId!");
      return NextResponse.json({ error: "Missing companyId parameter." }, { status: 400 });
    }

    if (!process.env.PESAPAL_IPN_ID) {
      console.error("[PESAPAL INITIATE] Missing PESAPAL_IPN_ID in .env file!");
      return NextResponse.json({ error: "Server Error: Missing PESAPAL_IPN_ID in your .env file." }, { status: 500 });
    }

    // =========================================================================
    // SECURITY: CALCULATE USAGE ON THE SERVER
    // This perfectly matches the frontend "Billing Page" logic to prevent tampering.
    // =========================================================================
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // We must use the Service Role Key here to bypass RLS and securely read all data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // FETCH IS_LOCKED TO RESPECT SUPERADMIN MANUAL OVERRIDES
    const { data: comp } = await supabaseAdmin
      .from("companies")
      .select("created_at, is_locked")
      .eq("id", companyId)
      .single();
      
    let countStartDate = comp?.created_at || new Date(0).toISOString();
    const isManuallyLocked = comp?.is_locked === true;

    // 1. Fetch recent transactions to see if they already paid recently
    const { data: recentTx, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("created_at, status")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("[PESAPAL INITIATE] Error fetching transactions:", txError);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (recentTx && recentTx.length > 0) {
      // Find the latest successful payment
      const lastPaid = recentTx.find(tx => 
        tx.status && (tx.status.toUpperCase() === 'COMPLETED' || tx.status.toUpperCase() === 'SUCCESS' || tx.status.toUpperCase() === 'PAID')
      );

      // Reset the counter to start EXACTLY after that payment
      if (lastPaid && new Date(lastPaid.created_at) > thirtyDaysAgo) {
        countStartDate = lastPaid.created_at;
      }
    }

    // 2. Count ONLY the unpaid visitors since the calculated reset date
    const { count, error } = await supabaseAdmin
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", countStartDate);

    if (error) {
      console.error("Error fetching visitor count:", error);
      return NextResponse.json({ error: "Failed to calculate usage." }, { status: 500 });
    }

    const visitorCount = count || 0;
    const RATE_PER_VISITOR = 3; 
    const exactAmountDue = visitorCount * RATE_PER_VISITOR;
    
    // =========================================================================
    // SUPERADMIN & ZERO BALANCE PROTECTION
    // =========================================================================
    if (exactAmountDue <= 0) {
      if (isManuallyLocked) {
        // If they owe nothing but are locked, it's a Superadmin manual ban.
        // We reject the payment so they can't use Pesapal to bypass the ban.
        return NextResponse.json({ 
          error: "Action Denied: Your account has been restricted by the Administrator. Please contact Support." 
        }, { status: 403 });
      } else {
        // If they owe nothing and are NOT locked, there's just no reason to pay.
        return NextResponse.json({ 
          error: "Your account is already fully settled. No payment required." 
        }, { status: 400 });
      }
    }

    // Pesapal will reject transactions that are too small (e.g., 0 KES).
    // If they owe e.g. 3 KES, we ensure it meets a minimum 10 KES gateway threshold.
    const amountToCharge = Math.max(exactAmountDue, 10);

    // =========================================================================

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const merchantReference = `${companyId}-${Date.now()}`;

    const orderData = {
      id: merchantReference,
      currency: "KES",
      amount: amountToCharge, // SECURE SERVER-CALCULATED AMOUNT
      description: `VMS Usage - ${visitorCount} Visitors`,
      callback_url: `${baseUrl}/dashboard/company-admin/payment-success`,
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: "admin@company.com", 
        phone_number: "0706123513",
        country_code: "KE",
        first_name: "Admin",
        middle_name: "",
        last_name: "",
        line_1: "",
        line_2: "",
        city: "",
        state: "",
        postal_code: "",
        zip_code: ""
      }
    };
    
    console.log(`[PESAPAL INITIATE] Charging ${amountToCharge} KES for ${visitorCount} unpaid visitors.`);

    const response = await submitOrder(orderData);

    if (response && response.redirect_url) {
      return NextResponse.json({ redirect_url: response.redirect_url });
    } else {
      throw new Error("Invalid response from Pesapal");
    }

  } catch (error: any) {
    console.error("Pesapal Initiate Error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate payment" }, { status: 500 });
  }
}