import { NextResponse } from "next/server";
import { getPesapalToken } from "@/lib/pesapal";

export async function GET(req: Request) {
  try {
    const token = await getPesapalToken();
    
    // This MUST be your Ngrok URL when testing locally, e.g., https://1234.ngrok-free.app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL; 

    const response = await fetch(`${process.env.PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        url: `${appUrl}/api/payments/pesapal/ipn`,
        ipn_notification_type: "GET" // PesaPal uses GET for IPN webhooks
      })
    });

    const data = await response.json();
    
    return NextResponse.json({
      instructions: "SUCCESS! Copy the ipn_id below and paste it into your .env.local file as PESAPAL_IPN_ID",
      pesapalResponse: data
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}