import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business, style, concept, language, titleLanguage, descriptionLanguage, product, offer, price, cta, learnedGuidance, feedback } =
      body || {};

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

      const prompt = `You are a marketing copywriter. Generate exactly 3 distinct and genuinely interesting notification variations for this request. The title must be in ${titleLanguage || language} and MUST be 30-40 characters inclusive. The description must be in ${descriptionLanguage || language} and MUST be 60-90 characters inclusive. Do not exceed these limits. Do not repeat common template wording. Make each variation meaningfully different while preserving the supplied facts. Use a strong curiosity, emotion, surprise, or relatable hook instead of generic ad copy.
  Request ID: ${crypto.randomUUID()}

  Business: ${business}
  Style: ${style}
  Concept: ${concept}
  Product: ${product}
  Offer: ${offer}
  Price: ${price}
  CTA: ${cta}

  User feedback about the previous result:
  ${feedback || "No previous feedback."}

  Learned notification-style guidance (use this only for writing style, never copy exact wording):
  ${typeof learnedGuidance === "string" ? learnedGuidance.slice(0, 6000) : "No learned guidance yet."}

  Return ONLY valid JSON:
{
  "variations": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Notification Generator",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          temperature: 0.9,
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
          console.error("OpenRouter API error:", error);
      return NextResponse.json(
            { error: "OpenRouter API failed", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    if (!text) {
      return NextResponse.json(
            { error: "No content from OpenRouter" },
        { status: 502 }
      );
    }

    let parsed;
    try {
      const clean = text
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON response", raw: text },
        { status: 502 }
      );
    }

    const variations = parsed.variations || [];
    if (variations.length < 3) {
      return NextResponse.json(
        { error: "Not enough variations", parsed },
        { status: 502 }
      );
    }

    return NextResponse.json({ variations: variations.slice(0, 3) });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
