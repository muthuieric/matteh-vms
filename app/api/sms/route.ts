import { NextResponse } from "next/server";
import Africastalking from "africastalking";

export async function POST(request: Request) {
  try {
    // 1. --- DIAGNOSTIC LOGS ---
    console.log("--- DIAGNOSTIC CHECK ---");
    
    // Safely grab the keys
    const rawUsername = process.env.AFRICASTALKING_USERNAME || "";
    const rawApiKey = process.env.AFRICASTALKING_API_KEY || "";

    // Forcefully remove any accidental invisible spaces or newlines
    const cleanUsername = rawUsername.trim();
    const cleanApiKey = rawApiKey.trim();

    console.log(`Username loaded: "${cleanUsername}"`);
    console.log(`API Key loaded (first 5 chars): "${cleanApiKey.substring(0, 5)}..."`);
    console.log(`API Key Length: ${cleanApiKey.length} characters`);
    console.log("------------------------");

    // Check if keys are actually missing
    if (!cleanApiKey || !cleanUsername) {
      throw new Error("Missing Africa's Talking credentials in .env.local file");
    }

    const credentials = {
      apiKey: cleanApiKey,
      username: cleanUsername,
    };

    const africastalking = Africastalking(credentials);
    const sms = africastalking.SMS;

    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required" },
        { status: 400 }
      );
    }

    // Format phone number (Africa's Talking requires international format)
    let formattedPhone = phone;
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+254" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone;
    }

    console.log("Attempting to send SMS to:", formattedPhone);

    // Send the SMS
    const options = {
      to: [formattedPhone],
      message: message,
    };

    const response = await sms.send(options);
    
    console.log("SMS Success:", response);
    return NextResponse.json({ success: true, data: response });
    
  } catch (error: any) {
    console.error("SMS Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to send SMS", details: error.message },
      { status: 500 }
    );
  }
}