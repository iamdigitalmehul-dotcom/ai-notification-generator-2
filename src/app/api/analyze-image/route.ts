import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:")) {
      return NextResponse.json(
        { error: "A valid image is required" },
        { status: 400 },
      );
    }

    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image data" },
        { status: 400 },
      );
    }

    const [, mimeType, data] = match;
    const prompt = `Read this advertisement image and extract only the visible campaign details. Return valid JSON only in this format:
{
  "business": "",
  "product": "",
  "offer": "",
  "price": "",
  "cta": ""
}
Use an empty string when a field is not visible. Do not invent values.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data } },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Gemini image analysis error:", details);
      return NextResponse.json(
        { error: "Gemini image analysis failed", details },
        { status: response.status },
      );
    }

    const result = await response.json();
    const text =
      result?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") || "";
    const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

    try {
      return NextResponse.json({ analysis: JSON.parse(clean) });
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid analysis JSON", raw: text },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
