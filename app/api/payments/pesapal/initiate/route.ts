import { NextResponse } from "next/server";
import { submitOrder } from "@/lib/pesapal"; 
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[PESAPAL INITIATE] Received body:", body);

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
    // We ignore any amount sent from the frontend to prevent tampering.
    // =========================================================================
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate usage for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count, error } = await supabaseAdmin
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (error) {
      console.error("Error fetching visitor count:", error);
      return NextResponse.json({ error: "Failed to calculate usage." }, { status: 500 });
    }

    const visitorCount = count || 0;
    
    // Set your rate here (3 KES based on your 500 * 3 = 1500 math)
    const RATE_PER_VISITOR = 3; 
    
    // Pesapal will reject transactions that are too small (e.g., 0 KES).
    // We enforce a minimum 10 KES charge so they can still process a payment 
    // to unlock their account even if they had 0 visitors last month.
    const amountToCharge = Math.max(visitorCount * RATE_PER_VISITOR, 10);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const merchantReference = `${companyId}-${Date.now()}`;

    const orderData = {
      id: merchantReference,
      currency: "KES",
      amount: amountToCharge, 
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
    
    console.log("[PESAPAL INITIATE] Sending Order Data to Pesapal:", orderData);

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