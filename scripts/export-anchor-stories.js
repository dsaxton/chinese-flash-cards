#!/usr/bin/env node
// scripts/export-anchor-stories.js
//
// Exports HSK1 cards with sound anchors as JSON for LLM story rewriting.
// Each entry includes the card's hanzi, pinyin, english meaning, extracted anchor
// words, current story text, components, and whether the anchor is already
// integrated into the story in ALL CAPS.
//
// Usage:
//   node scripts/export-anchor-stories.js              # all anchored cards
//   node scripts/export-anchor-stories.js --needs-rewrite  # only cards needing work
//   node scripts/export-anchor-stories.js > input.json

const path = require("path");
const { collectDeckCards } = require("./mnemonic-quality-lib");

// Extract anchor words from a "Think of X." or "Think of X, Y." phrase.
// Returns an array of uppercase strings, e.g. ["EYE"] or ["BEE-EN", "KNEE"].
function extractAnchorWords(soundAnchor) {
  const text = String(soundAnchor || "").trim();
  if (!text) return [];
  const match = text.match(/^Think of (.+?)\.?$/i);
  if (!match) return [];
  return match[1]
    .split(/,\s*/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

// Returns true if every anchor word appears in ALL CAPS as a standalone token
// in the story text. Hyphenated anchors (e.g. BEE-EN) are matched literally.
function anchorIntegratedInStory(anchorWords, story) {
  const text = String(story || "");
  return anchorWords.every((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word boundary on the non-hyphen characters around it
    return new RegExp(`(?<![A-Z\\-])${escaped}(?![A-Z\\-])`).test(text);
  });
}

function main() {
  const needsRewriteOnly = process.argv.includes("--needs-rewrite");
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards } = collectDeckCards(root);

  const rows = [];

  for (const card of hsk1Cards) {
    const md = card.mnemonicData || {};
    const soundAnchor = String(md.soundAnchor || "").trim();
    if (!soundAnchor) continue;

    const anchorWords = extractAnchorWords(soundAnchor);
    if (anchorWords.length === 0) continue;

    const story = String(md.story || "").trim();
    const integrated = anchorIntegratedInStory(anchorWords, story);

    if (needsRewriteOnly && integrated) continue;

    rows.push({
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      english: card.english,
      soundAnchor,
      anchorWords,
      currentStory: story,
      components: Array.isArray(md.components) ? md.components : [],
      anchorIntegrated: integrated,
    });
  }

  console.log(JSON.stringify(rows, null, 2));
  process.stderr.write(
    `Exported ${rows.length} cards` +
      (needsRewriteOnly ? " (needs-rewrite only)" : "") +
      ".\n"
  );
}

main();
