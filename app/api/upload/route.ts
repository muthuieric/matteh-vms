import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

// Initialize Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

// SECURITY: Define exact allowed types and a strict size limit (e.g., 5MB)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string;

    if (!file || !companyId) {
      return NextResponse.json({ error: "Missing file or company ID" }, { status: 400 });
    }

    // --- SECURITY CHECK 1: Validate Company ID ---
    // Initialize Supabase admin to check if the company actually exists
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS for this backend check
    );

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, is_locked')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Invalid Company ID. Upload rejected." }, { status: 403 });
    }
    
    if (company.is_locked) {
      return NextResponse.json({ error: "Company account is suspended." }, { status: 403 });
    }

    // --- SECURITY CHECK 2: File Size ---
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 413 });
    }

    // --- SECURITY CHECK 3: File Type ---
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, and WebP are allowed." }, { status: 415 });
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // --- SECURITY CHECK 4: Sanitize Filenames ---
    // Extract the extension safely, defaulting to jpg, and force it to lowercase
    const fileExtension = file.type.split('/')[1] || 'jpg';
    
    // Completely ignore the original file.name to prevent directory traversal attacks
    // Create a random, safe filename: "companyId/timestamp-randomstring.ext"
    const safeFileName = `${company.id}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    // Upload to Cloudflare R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: safeFileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${safeFileName}`;

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error: any) {
    console.error("Cloudflare Upload Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process upload" }, { status: 500 });
  }
}