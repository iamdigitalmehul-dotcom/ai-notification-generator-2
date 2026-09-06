"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type LearnedReference = {
  name: string;
  type: string;
  summary?: string;
  guidance?: string;
  examples?: string[];
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

const templates: Record<string, { title: string[]; description: string[] }> = {
  Funny: {
    title: ["Plan tha simple…", "Bhai, reality hit", "Tabiyat kharab?"],
    description: [
      "Phir BOGO ne sab reset kar diya. 🍕",
      "Aaj ka plan bhi overbooked ho gaya. 😅",
      "Jab deal aayi, to routine bhi ruk gaya. 😂",
    ],
  },
  FOMO: {
    title: ["Aaj nahi, to kab?", "Ye chance miss mat karo", "Last call hai"],
    description: [
      "Everyone is already tapping in. Be quick before it disappears.",
      "The window is closing, and the deal is moving fast.",
      "The crowd is on it—now it is your turn.",
    ],
  },
  Urgency: {
    title: ["Offer ends soon", "Only a few left", "Run before it ends"],
    description: [
      "The clock is ticking and the discount is slipping away.",
      "Stock is moving fast—don’t wait for tomorrow.",
      "Today’s deal may not be there tomorrow.",
    ],
  },
  Minimal: {
    title: ["New drop. Ready.", "Small win, big mood.", "This one deserves attention."],
    description: [
      "Minimal aesthetic, maximum payoff.",
      "Well-timed, well-made, worth the tap.",
      "A crisp offer for a sharper mood.",
    ],
  },
  Premium: {
    title: ["Elevated essentials", "Designed to stand out", "For the taste that notices"],
    description: [
      "Premium quality, premium feel, premium timing.",
      "Crafted for a sharper eye and a better routine.",
      "Refined details, without the extra noise.",
    ],
  },
};

const getToneText = (language: string, text: string) => {
  if (language === "Hindi") {
    return text
      .replace("The clock is ticking", "Samay khatam hone wala hai")
      .replace("don’t wait for tomorrow", "kal ka intezaar mat karo")
      .replace("Now it is your turn", "Ab aapki baari hai")
      .replace("Plan tha simple", "Plan toh simple tha")
      .replace("yesterday", "kal");
  }

  if (language === "Hinglish") {
    return text
      .replace("The clock is ticking", "Clock toh tik-tik kar raha hai")
      .replace("don’t wait for tomorrow", "kal ke liye wait mat karo")
      .replace("Now it is your turn", "Ab aapki turn hai")
      .replace("Plan tha simple", "Plan toh simple tha");
  }

  return text;
};

const clampLength = (text: string, maxLength: number) =>
  text.length > maxLength ? text.slice(0, maxLength - 1).trimEnd() + "…" : text;

const fitLength = (text: string, minLength: number, maxLength: number, padding: string) => {
  let result = text.trim();
  while (result.length < minLength) result = `${result} ${padding}`;
  return clampLength(result, maxLength);
};

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
  const [cta, setCta] = useState("Order Now");
  const [generated, setGenerated] = useState<Array<{ title: string; description: string; similarity: string }>>([]);
  const [copiedFields, setCopiedFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLearningOpen, setIsLearningOpen] = useState(false);
  const [learningFile, setLearningFile] = useState<File | null>(null);
  const [learnedReferences, setLearnedReferences] = useState<LearnedReference[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem("notification-learning-library");
    return saved ? JSON.parse(saved) : [];
  });
  const [isLearning, setIsLearning] = useState(false);
  const [learningMessage, setLearningMessage] = useState("");

  const learnedGuidance = learnedReferences
    .map((reference) => `${reference.name}: ${reference.summary ?? ""}\n${reference.guidance ?? ""}`)
    .join("\n\n");

  const charStats = useMemo(
    () => ({
      title: Math.min(TITLE_MAX_LENGTH, generated[0]?.title?.length ?? 0),
      description: Math.min(DESCRIPTION_MAX_LENGTH, generated[0]?.description?.length ?? 0),
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
    const isRegenerationAfterNoCopy = generated.length > 0 && Object.keys(copiedFields).length === 0;
    setIsLoading(true);
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
          feedback: isRegenerationAfterNoCopy
            ? "The previous notification was not copied, so the user did not find it interesting. Create a noticeably fresher, more attention-grabbing result with a stronger hook and less predictable wording."
            : "No negative feedback yet.",
          product,
          offer,
          price,
          cta,
          learnedGuidance,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Something went wrong");
      }

      const variance = (data.variations ?? []).map((item: { title: string; description: string }, index: number) => ({
        title: fitLength(getToneText(titleLanguage, item.title ?? ""), 30, TITLE_MAX_LENGTH, "Don't miss this"),
        description: fitLength(getToneText(descriptionLanguage, item.description ?? ""), 60, DESCRIPTION_MAX_LENGTH, "Tap before it ends."),
        similarity: index === 0 ? "Original" : index === 1 ? "High originality" : "Original",
      }));

      setGenerated(variance.length ? variance : []);
    } catch (error) {
      console.error("Generate API error:", error);
      const conceptTone = templates[style] ?? templates.Funny;
      const titlePool = conceptTone.title;
      const descriptionPool = conceptTone.description;

      const fallback = [
        {
          title: getToneText(titleLanguage, fitLength(`${product} ka plan tha simple…`, 30, TITLE_MAX_LENGTH, "Don't miss this")),
          description: getToneText(descriptionLanguage, fitLength(`${offer} ne plan hi badal diya. ${price} mein ${cta.toLowerCase()} karen.`, 60, DESCRIPTION_MAX_LENGTH, "Tap before it ends.")),
          similarity: "Original",
        },
        {
          title: getToneText(titleLanguage, fitLength(titlePool[0], 30, TITLE_MAX_LENGTH, "Don't miss this")),
          description: getToneText(descriptionLanguage, fitLength(descriptionPool[0], 60, DESCRIPTION_MAX_LENGTH, "Tap before it ends.")),
          similarity: "High originality",
        },
        {
          title: getToneText(titleLanguage, fitLength(`${concept}: ${product} x ${offer}`, 30, TITLE_MAX_LENGTH, "Don't miss this")),
          description: getToneText(descriptionLanguage, fitLength(`Aaj ka offer sirf ${price} mein available hai. ${cta} now before it slips away.`, 60, DESCRIPTION_MAX_LENGTH, "Tap before it ends.")),
          similarity: "Original",
        },
      ];

      setGenerated(fallback);
    } finally {
      setCopiedFields({});
      setIsLoading(false);
    }
  };

  const copyField = async (value: string, field: string, index: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedFields((previous) => ({ ...previous, [`${field}-${index}`]: true }));
  };

  const learnFromFile = async () => {
    if (!learningFile) return;
    setIsLearning(true);
    setLearningMessage("");
    try {
      const formData = new FormData();
      formData.append("file", learningFile);
      const response = await fetch("/api/learn", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Learning failed");
      const updated = [...learnedReferences, data];
      setLearnedReferences(updated);
      window.localStorage.setItem("notification-learning-library", JSON.stringify(updated));
      setLearningFile(null);
      setLearningMessage(data.warning ?? "Reference learned. Future notifications will use its style patterns.");
    } catch (error) {
      setLearningMessage(error instanceof Error ? error.message : "Learning failed");
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
                {isLoading ? "Generating..." : "Generate Notification"}
              </button>
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
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">MVP safeguards</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li>• Length-safe title and description checks</li>
                <li>• Similarity check before final output</li>
                <li>• Confirm/edit image fields before generation</li>
              </ul>
            </div>
            {learnedReferences.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">Style library</p>
                <p className="mt-2 text-sm text-slate-200">{learnedReferences.map((reference) => reference.name).join(", ")}</p>
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
                    <span className="text-xs font-medium text-emerald-600">Similarity: {item.similarity}</span>
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
                <p className="mt-2 text-sm leading-6 text-slate-600">Upload a reference image, PDF, or Word file. This teaches writing patterns only; it does not generate a notification or retrain OpenAI.</p>
              </div>
              <button onClick={() => setIsLearningOpen(false)} aria-label="Close learning dialog" className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
            </div>
            <label className="mt-6 block rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-6 text-center text-sm font-semibold text-slate-700">
              <span className="block text-3xl">↑</span>
              <span className="mt-2 block">Choose image, PDF, or Word file</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">Maximum 10 MB</span>
              <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => setLearningFile(event.target.files?.[0] ?? null)} className="sr-only" />
            </label>
            {learningFile ? <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">Selected: {learningFile.name}</p> : null}
            {learningMessage ? <p className="mt-3 text-sm text-emerald-700">{learningMessage}</p> : null}
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
