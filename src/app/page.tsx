"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  LearnedReference,
  listLearnedReferences,
  removeLearnedReference,
  saveLearnedReference,
} from "@/lib/learned-references";

type LearningResponse = Pick<LearnedReference, "name" | "type" | "content" | "summary"> & {
  warning?: string;
  error?: string;
};

const isLearningResponse = (value: unknown): value is LearningResponse => {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<LearningResponse>;
  return typeof response.name === "string" &&
    typeof response.type === "string" &&
    typeof response.content === "string";
};

const isGeneratedNotification = (value: unknown): value is GeneratedNotification => {
  if (!value || typeof value !== "object") return false;
  const notification = value as Partial<GeneratedNotification>;
  return typeof notification.format === "string" &&
    typeof notification.title === "string" &&
    typeof notification.description === "string";
};

type GeneratedNotification = {
  format: string;
  title: string;
  description: string;
};

const businesses = [
  "La Milano Pizza",
  "Urban Cart",
  "GlowSkin Studio",
  "Daily Basket",
  "FitFuel",
];

const styleOptions = [
  "Funny",
  "Clever",
  "Sarcastic",
  "Relatable",
  "Emotional",
  "Meme",
  "Friendly",
  "Premium",
  "Minimal",
  "Offer-focused",
  "Conversational",
];

const conceptOptions = [
  "Everyday Situation",
  "Unexpected Twist",
  "Expectation vs Reality",
  "Question Hook",
  "Curiosity Gap",
  "FOMO",
  "Urgency",
  "Problem → Solution",
  "Relatable Problem",
  "Wordplay",
  "Pun",
  "Sarcasm",
  "Reverse Psychology",
  "Confession",
  "Meme Style",
  "Conversation Style",
  "Challenge",
  "Secret/Mystery",
  "Shock Hook",
  "Emotional Hook",
  "Direct Offer",
  "Indirect Offer",
  "Social Situation",
  "Comparison",
  "Story Hook",
];

const languageOptions = ["English", "Hindi", "Hinglish"];
const TITLE_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 90;
const MAX_LEARNING_FILE_SIZE = 10 * 1024 * 1024;

export default function Home() {
  const [selectedBusiness, setSelectedBusiness] = useState(businesses[0]);
  const [style, setStyle] = useState(styleOptions[0]);
  const [concept, setConcept] = useState(conceptOptions[0]);
  const [titleLanguage, setTitleLanguage] = useState("Hinglish");
  const [descriptionLanguage, setDescriptionLanguage] = useState("English");
  const [imageName, setImageName] = useState("pizza-offer.png");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState("Pizza");
  const [offer, setOffer] = useState("BOGO");
  const [price, setPrice] = useState("₹299");
  const [cta, setCta] = useState("See the offer");
  const [generated, setGenerated] = useState<GeneratedNotification[]>([]);
  const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [isLearningOpen, setIsLearningOpen] = useState(false);
  const [learningFile, setLearningFile] = useState<File | null>(null);
  const [learnedReferences, setLearnedReferences] = useState<LearnedReference[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const [isLearning, setIsLearning] = useState(false);
  const [learningMessage, setLearningMessage] = useState("");
  const [learningMessageIsError, setLearningMessageIsError] = useState(false);

  useEffect(() => {
    listLearnedReferences()
      .then(setLearnedReferences)
      .catch((error: unknown) => {
        console.error("Could not load learning library:", error);
        setLibraryError("The saved learning library could not be loaded.");
      });
  }, []);

  const charStats = useMemo(
    () => ({
      title: generated[0]?.title?.length ?? 0,
      description: generated[0]?.description?.length ?? 0,
    }),
    [generated],
  );

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setImageName("No image selected");
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const generateNotifications = async () => {
    setIsLoading(true);
    setGenerationError("");
    setGenerated([]);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business: selectedBusiness,
          style,
          concept,
          titleLanguage,
          descriptionLanguage,
          product,
          offer,
          price,
          cta,
          learnedReferences: learnedReferences.map(({ name, content }) => ({ name, content })),
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : `Gemini request failed (HTTP ${response.status})`;
        throw new Error(message);
      }

      const variations =
        !data ||
        typeof data !== "object" ||
        !("variations" in data) ||
        !Array.isArray(data.variations)
          ? null
          : data.variations;
      if (!variations || variations.length < 3 || !variations.every(isGeneratedNotification)) {
        throw new Error("Gemini returned fewer than three valid notifications.");
      }

      setGenerated(variations);
    } catch (error) {
      console.error("Generate API error:", error);
      setGenerationError(error instanceof Error ? error.message : "Notification generation failed. Please retry.");
    } finally {
      setCopiedFields({});
      setIsLoading(false);
    }
  };

  const copyField = async (value: string, field: string, index: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedFields((previous) => ({ ...previous, [`${field}-${index}`]: true }));
  };

  const forgetLearnedReference = async (id: string) => {
    try {
      await removeLearnedReference(id);
      setLearnedReferences((references) => references.filter((reference) => reference.id !== id));
      setLibraryError("");
    } catch (error) {
      console.error("Could not remove learning reference:", error);
      setLibraryError("The selected learning reference could not be removed.");
    }
  };

  const handleLearningFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLearningMessage("");
    setLearningMessageIsError(false);

    if (file && file.size > MAX_LEARNING_FILE_SIZE) {
      setLearningFile(null);
      setLearningMessage("File size must be 10 MB or less.");
      setLearningMessageIsError(true);
      event.target.value = "";
      return;
    }

    setLearningFile(file);
  };

  const learnFromFile = async () => {
    if (!learningFile) return;
    setIsLearning(true);
    setLearningMessage("");
    setLearningMessageIsError(false);
    try {
      const formData = new FormData();
      formData.append("file", learningFile);
      const response = await fetch("/api/learn", { method: "POST", body: formData });
      const responseText = await response.text();
      let data: unknown;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(`Learning service returned an invalid response (${response.status})`);
      }
      if (!response.ok) {
        const errorMessage = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Learning failed";
        throw new Error(`Learning request failed (HTTP ${response.status}): ${errorMessage}`);
      }
      if (!isLearningResponse(data)) throw new Error("Learning service returned incomplete data");
      const learnedReference: LearnedReference = {
        id: crypto.randomUUID(),
        name: data.name,
        type: data.type,
        content: data.content,
        summary: data.summary,
      };
      await saveLearnedReference(learnedReference);
      const updated = [...learnedReferences, learnedReference];
      setLearnedReferences(updated);
      setLibraryError("");
      setLearningFile(null);
      setLearningMessage(data.warning ?? "Reference learned. Future notifications will use its style patterns.");
      setLearningMessageIsError(false);
    } catch (error) {
      setLearningMessage(error instanceof Error ? error.message : "Learning failed");
      setLearningMessageIsError(true);
    } finally {
      setIsLearning(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff6eb,_#f5f7ff_40%,_#eef3ff)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">AI Notification Generator</p>
            <h1 className="mt-2 text-3xl font-bold">Business Notification Studio</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">PRD-aligned MVP</span>
            <button onClick={() => setIsLearningOpen(true)} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600">
              Learn from files
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Generator UI</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">3–5 variants</span>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Upload Creative</label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-slate-600" />
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">{imageName}</span>
                    {imagePreview ? (
                      <button onClick={removeUploadedImage} type="button" aria-label="Remove uploaded creative" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">×</button>
                    ) : null}
                  </div>
                </div>
                {imagePreview ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                    <img src={imagePreview} alt="Uploaded creative preview" className="h-40 w-full rounded-lg object-cover" />
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">AI Detected (confirm/edit)</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Product
                    <input value={product} onChange={(e) => setProduct(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-0 focus:border-orange-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Offer
                    <input value={offer} onChange={(e) => setOffer(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-0 focus:border-orange-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Price
                    <input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-0 focus:border-orange-400" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    CTA
                    <input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-0 focus:border-orange-400" />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Business
                  <select value={selectedBusiness} onChange={(e) => setSelectedBusiness(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-orange-400">
                    {businesses.map((business) => (
                      <option key={business} value={business}>{business}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Style
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-orange-400">
                    {styleOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Concept
                  <select value={concept} onChange={(e) => setConcept(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-orange-400">
                    {conceptOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Title language
                  <select value={titleLanguage} onChange={(e) => setTitleLanguage(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-orange-400">
                    {languageOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Description language
                  <select value={descriptionLanguage} onChange={(e) => setDescriptionLanguage(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-orange-400">
                    {languageOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <button onClick={generateNotifications} disabled={isLoading} className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? "Generating with Gemini..." : "Generate Notification"}
              </button>
              {generationError ? (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <p>{generationError}</p>
                  <button
                    onClick={generateNotifications}
                    disabled={isLoading}
                    className="mt-3 rounded-lg bg-red-800 px-3 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {isLoading ? "Retrying..." : "Retry"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Knowledge Snapshot</h2>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200">{learnedReferences.length} learned</span>
            </div>

            <div className="space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Business</div>
                <div className="mt-2 text-base font-semibold">{selectedBusiness}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Style</div>
                <div className="mt-2 text-base font-semibold">{style}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Concept</div>
                <div className="mt-2 text-base font-semibold">{concept}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Output languages</div>
                <div className="mt-2 text-base font-semibold">Title: {titleLanguage}</div>
                <div className="mt-1 text-sm text-slate-300">Description: {descriptionLanguage}</div>
              </div>
              {libraryError ? (
                <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">
                  {libraryError}
                </div>
              ) : null}
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">MVP safeguards</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li>• Gemini length and quality validation</li>
                <li>• Confirm/edit image fields before generation</li>
              </ul>
            </div>
            {learnedReferences.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">Style library</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-200">
                  {learnedReferences.map((reference) => (
                    <li key={reference.id} className="flex items-start justify-between gap-2">
                      <span className="break-all">{reference.name}</span>
                      <button
                        type="button"
                        onClick={() => void forgetLearnedReference(reference.id)}
                        aria-label={`Remove ${reference.name} from the learning library`}
                        className="shrink-0 rounded border border-white/20 px-2 py-0.5 text-xs hover:bg-white/10"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Generated Notification</h2>
            <div className="flex gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-2 py-1">Title {charStats.title}/{TITLE_MAX_LENGTH}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">Desc {charStats.description}/{DESCRIPTION_MAX_LENGTH}</span>
            </div>
          </div>

          {generated.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              Click Generate Notification to create your first variations.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {generated.map((item, index) => (
                <article key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">Variation {index + 1}</span>
                  </div>
                  <div className="mb-3 rounded-xl bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Title</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Description</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button onClick={() => copyField(item.title, "title", index)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">
                      {copiedFields[`title-${index}`] ? "Title copied" : "Copy title"}
                    </button>
                    <button onClick={() => copyField(item.description, "description", index)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">
                      {copiedFields[`description-${index}`] ? "Description copied" : "Copy description"}
                    </button>
                    <button onClick={generateNotifications} disabled={isLoading} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50">Regenerate</button>
                    <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">Save</button>
                    <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">⭐</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isLearningOpen ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="learning-title">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Private style library</p>
                <h2 id="learning-title" className="mt-2 text-2xl font-bold text-slate-900">Teach notification style</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Upload a Markdown, TXT, JSON, PDF, or DOCX reference. Its text is saved in this browser and used as a style reference for Gemini.</p>
              </div>
              <button onClick={() => setIsLearningOpen(false)} aria-label="Close learning dialog" className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
            </div>
            <label className="mt-6 block rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-6 text-center text-sm font-semibold text-slate-700">
              <span className="block text-3xl">↑</span>
              <span className="mt-2 block">Choose MD, TXT, JSON, PDF, or DOCX file</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">Maximum 10 MB</span>
              <input type="file" accept=".md,.txt,.json,.pdf,.docx" onChange={handleLearningFileChange} className="sr-only" />
            </label>
            {learningFile ? <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">Selected: {learningFile.name}</p> : null}
            {learningMessage ? <p role={learningMessageIsError ? "alert" : "status"} className={`mt-3 text-sm ${learningMessageIsError ? "text-red-700" : "text-emerald-700"}`}>{learningMessage}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsLearningOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Close</button>
              <button onClick={learnFromFile} disabled={!learningFile || isLearning} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isLearning ? "Learning..." : "Add to learning"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
