import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Parses a full public URL and deletes the corresponding file from the R2 Bucket.
 * Call this right before you delete a visitor from the database!
 */
export async function deleteImageFromR2(publicUrl: string) {
  try {
    if (!publicUrl || !process.env.R2_PUBLIC_URL) return { success: false };

    // Extract the "Key" (filename) from the public URL
    // e.g., https://pub-123.r2.dev/companyId/image.jpg -> "companyId/image.jpg"
    const fileKey = publicUrl.replace(`${process.env.R2_PUBLIC_URL}/`, "");

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      })
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to delete image from R2:", error);
    return { success: false, error };
  }
}