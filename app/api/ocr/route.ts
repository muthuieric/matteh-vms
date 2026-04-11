import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Convert the uploaded file to Base64 for the free OCR API
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // =========================================================================
    // USING OCR.SPACE (100% Free, No Credit Card Required)
    // =========================================================================
    const ocrFormData = new FormData();
    ocrFormData.append("base64Image", dataUrl);
    ocrFormData.append("language", "eng");
    ocrFormData.append("isOverlayRequired", "false");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        // "helloworld" is their public free key, but you can get your own
        // free key instantly at https://ocr.space/ocrapi if this one gets rate-limited
        "apikey": "helloworld", 
      },
      body: ocrFormData as any,
    });

    const result = await response.json();

    if (!result || result.IsErroredOnProcessing || !result.ParsedResults || result.ParsedResults.length === 0) {
      console.error("[OCR] API Error:", result);
      return NextResponse.json({ error: "OCR Processing Failed" }, { status: 400 });
    }

    const fullText = result.ParsedResults[0].ParsedText || "";
    console.log("[OCR] Extracted Raw Text:", fullText);

    // =========================================================================
    // PARSING LOGIC: Extract ID Number and Name
    // =========================================================================
    
    // 1. Extract ID Number (Assuming standard 7 or 8 digit ID)
    const idRegex = /\b\d{7,8}\b/;
    const idMatch = fullText.match(idRegex);
    const extractedId = idMatch ? idMatch[0] : "";

    // 2. Extract Name
    let extractedName = "";
    const lines = fullText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const upperLine = lines[i].toUpperCase();
      
      if (upperLine.includes("FULL NAMES") || upperLine.includes("NAMES") || upperLine.includes("NAME")) {
        if (upperLine.includes(":") && upperLine.split(":")[1].trim().length > 0) {
          extractedName = lines[i].split(":")[1].trim();
          break;
        } else if (lines[i + 1]) {
          extractedName = lines[i + 1].replace(/[^a-zA-Z\s]/g, '').trim();
          break;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        name: extractedName,
        id_number: extractedId
      },
      rawText: fullText 
    });

  } catch (error: any) {
    console.error("[OCR] Process Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process ID image" }, { status: 500 });
  }
}