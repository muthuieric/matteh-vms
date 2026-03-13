import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // 1. Receive the IPN data from Pesapal
    const body = await request.json();
    const { OrderTrackingId, OrderNotificationType, OrderMerchantReference } = body;

    console.log("🔔 Received Pesapal IPN:", body);

    if (OrderNotificationType !== "IPNCHANGE") {
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    // 2. Authenticate with Pesapal to check the real transaction status
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    const baseUrl = "https://cybqa.pesapal.com/pesapalv3";

    if (!consumerKey || !consumerSecret) {
      console.warn("Missing Pesapal Keys. Cannot verify transaction.");
      return NextResponse.json({ status: 500 });
    }

    // Get Auth Token
    const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret })
    });
    const authData = await authResponse.json();
    const token = authData.token;

    // 3. Request the actual Transaction Status from Pesapal
    // (As defined in the GetTransactionStatus documentation)
    const statusResponse = await fetch(`${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const statusData = await statusResponse.json();
    console.log("💰 Transaction Status Data:", statusData);

    // 4. If the payment was COMPLETED (status_code: 1), update the database!
    if (statusData.status_code === 1) {
      // The OrderMerchantReference is the companyId we passed during checkout!
      const companyId = statusData.merchant_reference; 
      const amountPaid = statusData.amount;

      // Update the company account to paid and unlock it
      const { error } = await supabase
        .from("companies")
        .update({
          subscription_status: "paid",
          is_locked: false, // Instantly unlocks their dashboard!
          amount_paid: amountPaid 
        })
        .eq("id", companyId);

      if (error) {
        console.error("Database Update Failed:", error);
      } else {
        console.log(`✅ Successfully unlocked company: ${companyId}`);
      }
    }

    // 5. Respond to Pesapal exactly how their documentation demands
    return NextResponse.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200
    });

  } catch (error: any) {
    console.error("IPN Processing Error:", error);
    return NextResponse.json({ status: 500 });
  }
}