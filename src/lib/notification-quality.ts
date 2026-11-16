export type NotificationCandidate = {
  format: string;
  title: string;
  description: string;
};

const TITLE_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 90;
const BANNED_PHRASES = [
  "don't miss",
  "dont miss",
  "unlock",
  "hurry",
  "limited time",
  "dive into",
  "feast",
  "order now for",
  "taste fest",
  "tap before it ends",
  "before it slips away",
];

const normalizeText = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export const getOpeningWords = (value: string) => {
  const words = value.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.length >= 3
    ? `${words[0]} ${words[1]} ${words[2]}`.toLowerCase()
    : words.join(" ").toLowerCase();
};

export function isValidCandidate(
  candidate: NotificationCandidate,
  concept: string,
  seenOpenings: Set<string>,
) {
  if (
    candidate.format !== "notification" ||
    !candidate.title.trim() ||
    !candidate.description.trim() ||
    candidate.title.length > TITLE_MAX_LENGTH ||
    candidate.description.length > DESCRIPTION_MAX_LENGTH
  ) {
    return false;
  }

  const copy = normalizeText(`${candidate.title} ${candidate.description}`);
  if (BANNED_PHRASES.some((phrase) => copy.includes(normalizeText(phrase)))) return false;

  const normalizedTitle = normalizeText(candidate.title);
  const normalizedConcept = normalizeText(concept);
  if (normalizedConcept && normalizedTitle.includes(normalizedConcept)) return false;
  if (/\b[\p{L}\p{N}]+\s+x\s+[\p{L}\p{N}]+\b/iu.test(candidate.title)) return false;

  const sentences = candidate.description
    .split(/(?<=[.!?])\s+|\r?\n+/u)
    .map(normalizeText)
    .filter(Boolean);
  if (new Set(sentences).size !== sentences.length) return false;

  const opening = getOpeningWords(candidate.title);
  if (opening.split(" ").length === 3 && seenOpenings.has(opening)) return false;
  return true;
}
