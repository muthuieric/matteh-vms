import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize the client pointed at Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string;

    if (!file || !companyId) {
      return NextResponse.json({ error: "Missing file or company ID" }, { status: 400 });
    }

    // Convert the image file into a format Cloudflare understands (a Buffer)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a clean, unique filename (e.g., "companyId/167891234-abc123.jpg")
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${companyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    // Upload it to the bucket!
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Construct the final public URL where the image can be viewed
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error: any) {
    console.error("Cloudflare Upload Error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload file to Cloudflare" }, { status: 500 });
  }
}