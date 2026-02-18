#!/usr/bin/env node
// scripts/export-missing-stories.js
//
// Exports HSK1 cards with an empty mnemonicData.story for LLM story writing.
// Each entry includes all context needed to write a good story:
//   - hanzi, pinyin, english
//   - components (the radical/character breakdown with meanings)
//   - legacyMnemonic (for reference only — ALL leak the answer, do NOT copy)
//   - soundAnchor (if present, the story must integrate its word in ALL CAPS)
//   - category (compound | time | direction | question | other) — a rough hint
//
// Usage:
//   node scripts/export-missing-stories.js > work/missing-stories-input.json
//
// LLM output format expected by apply-story-rewrites.js:
//   [ { "hanzi": "飞机", "rewrittenStory": "A metal bird roars upward on twin wings." }, ... ]

const path = require("path");
const { collectDeckCards, getStoryText } = require("./mnemonic-quality-lib");

const QUESTION_WORDS = new Set([
  "which", "who", "what", "how", "where", "when",
]);

const TIME_WORDS = new Set([
  "morning", "afternoon", "noon", "today", "tomorrow", "yesterday", "week",
  "moment", "time",
]);

const DIRECTION_WORDS = new Set([
  "front", "behind", "below", "under", "above",
  "in front of", "in back of",
]);

function categorize(card) {
  const eng = (card.english || "").toLowerCase();
  const tokens = eng.match(/[a-z]+/g) || [];

  if (tokens.some((t) => QUESTION_WORDS.has(t)) || eng.includes("particle")) {
    return "question_or_particle";
  }
  if (tokens.some((t) => TIME_WORDS.has(t))) {
    return "time";
  }
  if (tokens.some((t) => DIRECTION_WORDS.has(t)) || eng.includes("in front") || eng.includes("behind")) {
    return "direction";
  }
  if ((card.hanzi || "").length > 1) {
    return "compound";
  }
  return "other";
}

function main() {
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards } = collectDeckCards(root);

  const rows = [];

  for (const card of hsk1Cards) {
    if (getStoryText(card) !== "") continue;

    const md = card.mnemonicData || {};
    const soundAnchor = String(md.soundAnchor || "").trim();

    rows.push({
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      english: card.english,
      components: Array.isArray(md.components) ? md.components : [],
      legacyMnemonic: (card.mnemonic || "").trim(),
      soundAnchor: soundAnchor || null,
      category: categorize(card),
    });
  }

  console.log(JSON.stringify(rows, null, 2));
  process.stderr.write(`Exported ${rows.length} cards needing stories.\n`);
}

main();
