import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a file" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 10 MB or less" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      extractedText = result.text;
      await parser.destroy();
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")
    ) {
      extractedText = (await mammoth.extractRawText({ buffer })).value;
    } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
      extractedText = buffer.toString("utf8");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        name: file.name,
        type: file.type || "unknown",
        summary: extractedText
          ? `Reference text saved (${extractedText.trim().length} characters).`
          : "Reference saved. Add an OpenRouter key to create an AI style summary.",
        guidance: extractedText.slice(0, 3000),
      });
    }

    const isImage = file.type.startsWith("image/");
    const prompt = "You are learning notification writing style from a reference file. This is NOT a request to generate a notification. Analyze only the patterns in the reference and return JSON with exactly these keys: summary (one sentence), guidance (4-6 concise rules about tone, length, hooks, CTA, formatting), examples (up to 3 short examples copied or paraphrased from the reference). Do not invent brand facts.";
    const content = isImage
      ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${file.type};base64,${buffer.toString("base64")}` } }]
      : [{ type: "text", text: `${prompt}\n\nREFERENCE TEXT:\n${extractedText.slice(0, 12000)}` }];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Notification Generator Learning",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("OpenRouter learning error:", details);
      if (extractedText.trim()) {
        return NextResponse.json({
          name: file.name,
          type: file.type || "unknown",
          summary: "Reference text saved. AI summary was unavailable, so the extracted notification examples will still guide future generations.",
          guidance: extractedText.slice(0, 3000),
          warning: "AI summary unavailable; extracted text was saved.",
        });
      }
      return NextResponse.json({ error: "AI learning analysis failed", details }, { status: 502 });
    }
    const result = await response.json();
    const text = result?.choices?.[0]?.message?.content || "{}";
    const analysis = JSON.parse(text.replace(/```json\s*/gi, "").replace(/```/g, "").trim());
    return NextResponse.json({ name: file.name, type: file.type || "unknown", ...analysis });
  } catch (error) {
    console.error("Learning route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to learn from this file" },
      { status: 500 },
    );
  }
}