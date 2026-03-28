import { NextResponse } from "next/server";
import { submitOrder } from "@/lib/pesapal"; 

export async function POST(req: Request) {
  try {
    const { companyId, months } = await req.json();

    if (!companyId || !months) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // --- SECURITY FIX START ---
    // The server calculates the price where the user cannot manipulate it
    const validMonths = [1, 2, 6, 12];
    const parsedMonths = Number(months);

    if (!validMonths.includes(parsedMonths)) {
      return NextResponse.json({ error: "Invalid subscription duration" }, { status: 400 });
    }

    const amountToCharge = parsedMonths * 5000;
    // --- SECURITY FIX END ---

    // Generate a unique merchant reference combining company ID and timestamp
    const merchantReference = `${companyId}-${Date.now()}`;

    const orderData = {
      id: merchantReference,
      currency: "KES",
      amount: amountToCharge, // Safe, server-calculated amount
      description: `VMS Subscription - ${parsedMonths} Month(s)`,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company-admin/payment-success`,
      notification_id: process.env.PESAPAL_IPN_ID!,
      billing_address: {
        email_address: "admin@company.com", // You can pull actual email from DB if needed
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

    const response = await submitOrder(orderData);

    if (response && response.redirect_url) {
      return NextResponse.json({ redirect_url: response.redirect_url });
    } else {
      throw new Error("Invalid response from Pesapal");
    }

  } catch (error) {
    console.error("Pesapal Initiate Error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}