import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // We added visitorPhone to the incoming data
    const { hostEmail, hostName, visitorName, visitorPhone, companyName, purpose } = await request.json();

    if (!hostEmail) {
      return NextResponse.json({ error: "No host email provided." }, { status: 400 });
    }

    // Attempt to send email
    const data = await resend.emails.send({
      from: 'matteh-vms Security <onboarding@resend.dev>', 
      to: [hostEmail],
      subject: `Arrival Alert: ${visitorName} is here to see you`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px;">
          <h2 style="color: #000; margin-top: 0;">Hello ${hostName},</h2>
          <p>You have a visitor waiting at the security gate for <strong>${companyName}</strong>.</p>
          
          <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0 0 10px 0;"><strong>Visitor Name:</strong> ${visitorName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Phone Number:</strong> ${visitorPhone || 'Not provided'}</p>
            <p style="margin: 0;"><strong>Stated Purpose:</strong> ${purpose}</p>
          </div>
          
          <p style="font-size: 14px; color: #71717a; margin-bottom: 0;">
            The security team is currently processing their entry.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Email API Error:", error);
    return NextResponse.json({ error: "Failed to send notification email." }, { status: 500 });
  }
}