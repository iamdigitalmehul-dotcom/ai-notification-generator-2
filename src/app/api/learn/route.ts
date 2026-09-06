import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

const savedReferenceFallback = (name: string, type: string, reason: string) =>
  NextResponse.json({
    name,
    type: type || "unknown",
    summary: "Reference received, but AI analysis was unavailable. A basic notification style guide was saved.",
    guidance: "Use a short attention-grabbing hook, state one clear benefit, keep the tone conversational, and finish with a direct call to action.",
    warning: reason,
  });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file !== "object" || !("arrayBuffer" in file) || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Please upload a file" }, { status: 400 });
    }
    const uploadedFile = file as File;
    const lowerName = uploadedFile.name.toLowerCase();
    const isImage = uploadedFile.type.startsWith("image/");
    const isPdf = uploadedFile.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isDocx = uploadedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || lowerName.endsWith(".docx");
    const isText = uploadedFile.type.startsWith("text/") || lowerName.endsWith(".txt");
    if (!isImage && !isPdf && !isDocx && !isText) {
      return NextResponse.json({ error: "Only image, PDF, DOCX, or TXT files are supported" }, { status: 415 });
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 10 MB or less" }, { status: 413 });
    }

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    let extractedText = "";
    if (isPdf) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      extractedText = result.text;
      await parser.destroy();
    } else if (isDocx) {
      extractedText = (await mammoth.extractRawText({ buffer })).value;
    } else if (isText) {
      extractedText = buffer.toString("utf8");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        name: uploadedFile.name,
        type: uploadedFile.type || "unknown",
        summary: extractedText
          ? `Reference text saved (${extractedText.trim().length} characters).`
          : "Reference saved. Add an OpenRouter key to create an AI style summary.",
        guidance: extractedText.slice(0, 3000),
      });
    }

    const prompt = "You are learning notification writing style from a reference file. This is NOT a request to generate a notification. Analyze only the patterns in the reference and return JSON with exactly these keys: summary (one sentence), guidance (4-6 concise rules about tone, length, hooks, CTA, formatting), examples (up to 3 short examples copied or paraphrased from the reference). Do not invent brand facts.";
    const content = isImage
      ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${uploadedFile.type};base64,${buffer.toString("base64")}` } }]
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
      signal: AbortSignal.timeout(50000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("OpenRouter learning error:", details);
      if (extractedText.trim()) {
        return NextResponse.json({
          name: uploadedFile.name,
          type: uploadedFile.type || "unknown",
          summary: "Reference text saved. AI summary was unavailable, so the extracted notification examples will still guide future generations.",
          guidance: extractedText.slice(0, 3000),
          warning: "AI summary unavailable; extracted text was saved.",
        });
      }
      return savedReferenceFallback(
        uploadedFile.name,
        uploadedFile.type,
        `AI analysis unavailable (${response.status}). Check OpenRouter credits, model access, or API key. ${details.slice(0, 300)}`,
      );
    }
    const responseText = await response.text();
    if (!responseText.trim()) {
      return NextResponse.json({ error: "AI learning provider returned an empty response" }, { status: 502 });
    }
    const result = JSON.parse(responseText);
    const text = result?.choices?.[0]?.message?.content || "{}";
    const analysis = JSON.parse(text.replace(/```json\s*/gi, "").replace(/```/g, "").trim());
    return NextResponse.json({ name: uploadedFile.name, type: uploadedFile.type || "unknown", ...analysis });
  } catch (error) {
    console.error("Learning route error:", error);
    return savedReferenceFallback(
      "Uploaded reference",
      "unknown",
      `AI learning could not complete: ${error instanceof Error ? error.message : "unknown server error"}`,
    );
  }
}