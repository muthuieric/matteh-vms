import { NextResponse } from "next/server";
import { submitOrder } from "@/lib/pesapal"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // DEBUG LOG: This will show you exactly what your frontend is sending
    console.log("[PESAPAL INITIATE] Received body:", body);

    const companyId = body.companyId || body.company_id || body.id || body.company;
    
    // FIX: Look for 'months', but if the frontend sends 'amount' instead, convert it!
    let months = body.months || body.duration || body.monthsToPay || body.plan;
    
    if (!months && body.amount) {
      // Example: 5000 / 5000 = 1 month. 
      // Math.max(1, ...) ensures that if you send '10' for testing, it still defaults to 1 month.
      months = Math.max(1, Math.round(Number(body.amount) / 5000)); 
    }

    if (!companyId || !months) {
      console.error("[PESAPAL INITIATE] Missing parameters! We got:", body);
      return NextResponse.json({ 
        error: `Missing parameters! We received: ${JSON.stringify(body)}` 
      }, { status: 400 });
    }

    // Security check: The server calculates the price where the user cannot manipulate it
    const validMonths = [1, 2, 6, 12];
    const parsedMonths = Number(months);

    if (isNaN(parsedMonths) || !validMonths.includes(parsedMonths)) {
      return NextResponse.json({ 
        error: `Invalid subscription duration. Calculated: ${months} months` 
      }, { status: 400 });
    }

    // CHANGED TO 10 FOR TESTING (10 KES per month). 
    // Change back to 5000 when going live!
    const amountToCharge = parsedMonths * 10; 

    // --- NEW: STRICT ENVIRONMENT VARIABLE CHECKS ---
    if (!process.env.PESAPAL_IPN_ID) {
      console.error("[PESAPAL INITIATE] Missing PESAPAL_IPN_ID in .env file!");
      return NextResponse.json({ error: "Server Error: Missing PESAPAL_IPN_ID in your .env file." }, { status: 500 });
    }

    // Fallback to localhost if BASE_URL is missing during local testing
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Generate a unique merchant reference combining company ID and timestamp
    const merchantReference = `${companyId}-${Date.now()}`;

    const orderData = {
      id: merchantReference,
      currency: "KES",
      amount: amountToCharge, 
      description: `VMS Subscription - ${parsedMonths} Month(s)`,
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
    // Return Pesapal's exact error message so we know exactly what they are rejecting
    return NextResponse.json({ error: error.message || "Failed to initiate payment" }, { status: 500 });
  }
}