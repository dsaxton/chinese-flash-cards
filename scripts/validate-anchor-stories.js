#!/usr/bin/env node
// scripts/validate-anchor-stories.js
//
// Checks that all HSK1 cards with sound anchors have the anchor word(s)
// integrated in ALL CAPS within the story text. Also flags stories that
// still contain forbidden "Think of" / "sounds like" phonetic cue phrases.
//
// Usage:
//   node scripts/validate-anchor-stories.js
//   node scripts/validate-anchor-stories.js --fail-on-missing

const path = require("path");
const {
  collectDeckCards,
  hintContainsPhoneticCue,
} = require("./mnemonic-quality-lib");

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

function anchorIntegratedInStory(anchorWords, story) {
  const text = String(story || "");
  return anchorWords.every((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![A-Z\\-])${escaped}(?![A-Z\\-])`).test(text);
  });
}

function main() {
  const failOnMissing = process.argv.includes("--fail-on-missing");
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards } = collectDeckCards(root);

  let total = 0;
  let integrated = 0;
  const missing = [];
  const cuePhraseLeaks = [];

  for (const card of hsk1Cards) {
    const md = card.mnemonicData || {};
    const soundAnchor = String(md.soundAnchor || "").trim();
    if (!soundAnchor) continue;

    const anchorWords = extractAnchorWords(soundAnchor);
    if (anchorWords.length === 0) continue;

    total++;
    const story = String(md.story || "").trim();

    if (anchorIntegratedInStory(anchorWords, story)) {
      integrated++;
    } else {
      missing.push({ hanzi: card.hanzi, pinyin: card.pinyin, anchorWords, story });
    }

    if (hintContainsPhoneticCue(story)) {
      cuePhraseLeaks.push({ hanzi: card.hanzi, pinyin: card.pinyin, story });
    }
  }

  const pct = total > 0 ? Math.round((100 * integrated) / total) : 0;
  console.log(`Cards with sound anchors:   ${total}`);
  console.log(`Anchor integrated in story: ${integrated} / ${total} (${pct}%)`);
  console.log(`Not yet integrated:         ${missing.length}`);
  console.log(`Forbidden cue phrases:      ${cuePhraseLeaks.length}`);

  if (missing.length > 0) {
    console.log("\nNeeds integration:");
    for (const r of missing) {
      const anchor = r.anchorWords.join(", ");
      console.log(`  ${r.hanzi} (${r.pinyin}) [${anchor}] "${r.story}"`);
    }
  }

  if (cuePhraseLeaks.length > 0) {
    console.log("\nForbidden phonetic cue phrase in story:");
    for (const r of cuePhraseLeaks) {
      console.log(`  ${r.hanzi} (${r.pinyin}) "${r.story}"`);
    }
  }

  if (failOnMissing && missing.length > 0) {
    process.exit(1);
  }
}

main();
