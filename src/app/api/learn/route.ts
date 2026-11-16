import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".md", ".txt", ".json", ".pdf", ".docx"];

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file !== "object" || !("arrayBuffer" in file) || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Please upload a file" }, { status: 400 });
    }

    const uploadedFile = file as File;
    const lowerName = uploadedFile.name.toLowerCase();
    const extension = SUPPORTED_EXTENSIONS.find((item) => lowerName.endsWith(item));
    if (!extension) {
      return NextResponse.json(
        { error: "Supported files are Markdown, TXT, JSON, PDF, and DOCX" },
        { status: 415 },
      );
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 10 MB or less" }, { status: 413 });
    }

    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    let content: string;
    if (extension === ".pdf") {
      const { DOMMatrix } = await import("@napi-rs/canvas");
      if (typeof globalThis.DOMMatrix === "undefined") {
        Object.defineProperty(globalThis, "DOMMatrix", {
          value: DOMMatrix,
          configurable: true,
          writable: true,
        });
      }
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        content = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (extension === ".docx") {
      content = (await mammoth.extractRawText({ buffer })).value;
    } else {
      content = buffer.toString("utf8").replace(/^\uFEFF/u, "");
      if (extension === ".json") {
        try {
          content = JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          return NextResponse.json({ error: "The selected JSON file is not valid JSON" }, { status: 400 });
        }
      }
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: "No readable text was found in this file. Upload a text-based reference." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      name: uploadedFile.name,
      type: uploadedFile.type || "text/plain",
      summary: `Saved ${content.length} characters from this reference.`,
      content,
    });
  } catch (error) {
    console.error("Learning file extraction failed:", error);
    return NextResponse.json(
      { error: "Could not read this file. Check its format and try again." },
      { status: 500 },
    );
  }
}
