import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    // We no longer expect visitorId or origin from the frontend
    const { 
      hostEmail, 
      hostName, 
      visitorName, 
      visitorPhone, 
      companyName, 
      purpose,
      visitorPhoto,
      companyId
    } = await request.json();

    if (!hostEmail) {
      return NextResponse.json({ error: "No host email provided." }, { status: 400 });
    }

    // THIS FIXES THE "UNDEFINED" ISSUE:
    // It automatically reads your website URL (e.g. http://localhost:3000 or your live domain)
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin; 
    
    // Creates exactly the link you wanted: http://localhost:3000/[companyId]/host-confirm
    const confirmLink = `${origin}/${companyId}/host-confirm`;

    const { data, error } = await resend.emails.send({
      from: 'matteh-vms Security <onboarding@resend.dev>', 
      to: [hostEmail],
      subject: `Arrival Alert: ${visitorName} is here to see you`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 12px;">
          <h2 style="color: #000; margin-top: 0;">Hello ${hostName},</h2>
          <p>You have a visitor waiting at the security gate for <strong>${companyName}</strong>.</p>
          
          <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            
            ${visitorPhoto ? `<img src="${visitorPhoto}" alt="Visitor Photo" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 2px solid #e4e4e7; display: block;" />` : ''}
            
            <p style="margin: 0 0 10px 0;"><strong>Visitor Name:</strong> ${visitorName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Phone Number:</strong> ${visitorPhone || 'Not provided'}</p>
            <p style="margin: 0 0 10px 0;"><strong>Stated Purpose:</strong> ${purpose}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <p style="font-size: 14px; color: #52525b; margin-bottom: 10px;">When the visitor arrives, please ask them for the <strong>OTP code</strong> they received at the gate.</p>
            <p style="font-size: 14px; color: #52525b; margin-bottom: 5px;">Click the link below to enter their code and confirm their visit:</p>
            
            <!-- THIS IS THE PLAIN LINK YOU REQUESTED -->
            <a href="${confirmLink}" style="color: #2563eb; font-weight: bold; font-size: 16px; word-break: break-all;">
              ${confirmLink}
            </a>
          </div>
          
          <p style="font-size: 12px; color: #71717a; margin-bottom: 0;">
            If you are not expecting this visitor, please contact security.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error details:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Failed to send notification email." }, { status: 500 });
  }
}