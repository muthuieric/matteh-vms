import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // 1. Get credentials from environment variables (sandbox/test mode by default)
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    
    // Pesapal V3 Endpoints (Use https://pay.pesapal.com/v3 for production)
    const baseUrl = "https://cybqa.pesapal.com/pesapalv3";

    if (!consumerKey || !consumerSecret) {
      // If no keys are set, we will simulate a success so you can see how it works!
      console.log("No Pesapal keys found. Running in TEST SIMULATION mode.");
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return NextResponse.json({
        success: true,
        // In simulation, we just redirect them to a fake success page or back to login
        redirect_url: "/login?payment=simulated",
        message: "Simulated checkout successful"
      });
    }

    // --- REAL PESAPAL 3.0 INTEGRATION ---

    // Step 2: Request Authentication Token
    const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret
      })
    });

    const authData = await authResponse.json();
    
    if (!authData.token) {
      throw new Error("Failed to authenticate with Pesapal");
    }

    const token = authData.token;

    // Step 3: Submit the Order to generate the payment link
    // We pass the companyId as the "account_number" or "reference" so we know who paid later!
    const orderPayload = {
      id: `VMS-${Date.now()}-${companyId.substring(0, 6)}`,
      currency: "KES",
      amount: 5000.00,
      description: "VMS Platform Subscription - Standard Plan",
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pesapal/callback`,
      notification_id: process.env.PESAPAL_IPN_ID || "", // You'll generate this once via API later
      billing_address: {
        email_address: "billing@clientbuilding.com",
        phone_number: "",
        country_code: "KE",
        first_name: "Building",
        middle_name: "",
        last_name: "Manager",
        line_1: "",
        line_2: "",
        city: "Nairobi",
        state: "",
        postal_code: "",
        zip_code: ""
      }
    };

    const orderResponse = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderResponse.json();

    if (orderData.error) {
      throw new Error(orderData.error.message || "Failed to submit order");
    }

    // Return the generated Pesapal iframe URL to the frontend!
    return NextResponse.json({
      success: true,
      redirect_url: orderData.redirect_url,
      order_tracking_id: orderData.order_tracking_id
    });

  } catch (error: any) {
    console.error("Pesapal Checkout Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment", details: error.message },
      { status: 500 }
    );
  }
}