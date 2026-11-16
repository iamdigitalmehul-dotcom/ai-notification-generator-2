import assert from "node:assert/strict";
import test from "node:test";
import {
  getOpeningWords,
  isValidCandidate,
} from "../src/lib/notification-quality.ts";

const candidate = (title, description = "A fresh line for pizza fans.") => ({
  format: "notification",
  title,
  description,
});

test("accepts a distinct candidate within the character limits", () => {
  assert.equal(isValidCandidate(candidate("Pizza nights, solved", "Two slices, one happy table."), "Everyday Situation", new Set()), true);
});

test("rejects overlong titles and descriptions instead of truncating them", () => {
  assert.equal(isValidCandidate(candidate("P".repeat(41)), "Pizza", new Set()), false);
  assert.equal(isValidCandidate(candidate("Pizza deal", "D".repeat(91)), "Pizza", new Set()), false);
});

test("rejects banned phrases, concept labels, and product x offer titles", () => {
  const bannedPhrases = [
    "Don't miss",
    "Dont miss",
    "Unlock",
    "Hurry",
    "Limited time",
    "Dive into",
    "Feast",
    "Order now for",
    "Taste fest",
    "Tap before it ends",
    "Before it slips away",
  ];
  for (const phrase of bannedPhrases) {
    assert.equal(isValidCandidate(candidate("Fresh pizza news", `${phrase}, pizza fans.`), "", new Set()), false);
  }
  assert.equal(isValidCandidate(candidate("Tumhara Dost! Don't miss pizza"), "", new Set()), false);
  assert.equal(isValidCandidate(candidate("Tumhara Dost! Don’t miss pizza"), "", new Set()), false);
  assert.equal(isValidCandidate(candidate("Everyday Situation"), "Everyday Situation", new Set()), false);
  assert.equal(isValidCandidate(candidate("Pizza x BOGO"), "Pun", new Set()), false);
});

test("rejects duplicate description sentences", () => {
  assert.equal(isValidCandidate(candidate("Pizza plans feel easy", "Pizza is ready. Pizza is ready."), "Everyday Situation", new Set()), false);
});

test("rejects a repeated three-word title opening", () => {
  const openings = new Set([getOpeningWords("Pizza nights just changed")]);
  assert.equal(isValidCandidate(candidate("Pizza nights just got better"), "Pun", openings), false);
});
