import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Look for OpenAI key in your .env.local file
    const openAiKey = process.env.OPENAI_API_KEY;

    // TEST MODE: If you haven't added your API key yet, simulate a successful scan
    if (!openAiKey) {
      console.log("No OpenAI key found. Simulating ID scan...");
      await new Promise(r => setTimeout(r, 1500)); // 1.5s delay
      return NextResponse.json({
        success: true,
        data: { FullName: "JOHN DOE", IDNumber: "12345678" }
      });
    }

    // --- REAL OPENAI VISION IMPLEMENTATION ---
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // The cheapest and fastest vision model
        messages: [
          {
            role: "system",
            content: "You are an ID card data extractor. Extract the person's full name and their ID number from the provided image. Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or other text: {\"FullName\": \"extracted name\", \"IDNumber\": \"extracted number\"}."
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                  detail: "high" // Ensures text is readable
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.0, // Force it to be factual, not creative
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI Error:", errText);
      throw new Error("Failed to process image with OpenAI");
    }

    const result = await response.json();
    const content = result.choices[0].message.content.trim();

    // Parse the JSON string OpenAI returned
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (e) {
      // Fallback in case OpenAI accidentally wraps it in markdown blocks
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      extractedData = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      data: extractedData
    });

  } catch (error: any) {
    console.error("OCR API Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to process ID card", details: error.message },
      { status: 500 }
    );
  }
}