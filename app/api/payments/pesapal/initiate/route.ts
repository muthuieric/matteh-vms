import { NextResponse } from "next/server";
import { getPesapalToken } from "@/lib/pesapal";

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Missing company ID" }, { status: 400 });
    }

    const token = await getPesapalToken();

    // FIX: Supabase UUIDs are 36 chars. A 5-digit random number is 5 chars. 
    // Format: "companyId-12345" (42 characters total, well under PesaPal's 50-char limit!)
    const shortRandom = Math.floor(10000 + Math.random() * 90000);
    const uniqueMerchantReference = `${companyId}-${shortRandom}`;

    const orderPayload = {
      id: uniqueMerchantReference, 
      currency: "KES",
      amount: 5000,
      description: "VMS Global Standard Plan Subscription",
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company-admin/payment-success`,
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: "admin@vmsglobal.com", 
        phone_number: "0700000000",
        country_code: "KE",
        first_name: "Admin",
        last_name: "User",
        line_1: "Nairobi",
        city: "Nairobi",
      }
    };

    const response = await fetch(`${process.env.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (data.error) {
      console.error("PesaPal Error:", data.error);
      throw new Error(data.error.message || "Failed to initiate transaction");
    }

    return NextResponse.json({ redirect_url: data.redirect_url });

  } catch (error: any) {
    console.error("Initiation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}