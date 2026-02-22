#!/usr/bin/env node
// scripts/validate-anchor-stories.js
//
// Checks that cards with sound anchors have a canonical single-word
// anchor ("Think of WORD."), integrated in story text either by exact anchor
// token or configured alias fragment.
// Also flags stories that still contain forbidden "Think of" / "sounds like"
// phonetic cue phrases.
//
// Usage:
//   node scripts/validate-anchor-stories.js
//   node scripts/validate-anchor-stories.js --mode all|hsk1|radicals|numbers
//   node scripts/validate-anchor-stories.js --fail-on-missing

const path = require("path");
const {
  anchorFormsForStory,
  anchorIntegratedInStoryWithAliases,
  collectDeckCards,
  extractCanonicalAnchorWord,
  hintContainsPhoneticCue,
  loadPhoneticConfig,
  normalizeAnchorAliasMap,
} = require("./mnemonic-quality-lib");

function main() {
  const failOnMissing = process.argv.includes("--fail-on-missing");
  const modeArgIndex = process.argv.indexOf("--mode");
  const mode = modeArgIndex !== -1 ? String(process.argv[modeArgIndex + 1] || "all") : "all";
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards, radicals, numbers } = collectDeckCards(root);
  const phoneticConfig = loadPhoneticConfig(root);
  const anchorAliasMap = normalizeAnchorAliasMap(phoneticConfig.phoneticAnchorAliases);
  const cards =
    mode === "hsk1" ? hsk1Cards :
      mode === "radicals" ? radicals :
        mode === "numbers" ? numbers :
          [...hsk1Cards, ...radicals, ...numbers];

  let total = 0;
  let integrated = 0;
  const missing = [];
  const cuePhraseLeaks = [];
  const malformedAnchors = [];

  for (const card of cards) {
    const md = card.mnemonicData || {};
    const soundAnchor = String(md.soundAnchor || "").trim();
    if (!soundAnchor) continue;

    const anchorWord = extractCanonicalAnchorWord(soundAnchor);
    const anchorForms = anchorFormsForStory(soundAnchor, anchorAliasMap);
    if (!anchorWord) {
      malformedAnchors.push({ hanzi: card.hanzi, pinyin: card.pinyin, soundAnchor });
      continue;
    }

    total++;
    const story = String(md.story || "").trim();

    if (anchorIntegratedInStoryWithAliases(soundAnchor, story, anchorAliasMap)) {
      integrated++;
    } else {
      missing.push({ hanzi: card.hanzi, pinyin: card.pinyin, anchorWord, anchorForms, story });
    }

    if (hintContainsPhoneticCue(story)) {
      cuePhraseLeaks.push({ hanzi: card.hanzi, pinyin: card.pinyin, story });
    }
  }

  const pct = total > 0 ? Math.round((100 * integrated) / total) : 0;
  console.log(`Cards checked (${mode}):    ${cards.length}`);
  console.log(`Cards with sound anchors:   ${total}`);
  console.log(`Anchor integrated in story: ${integrated} / ${total} (${pct}%)`);
  console.log(`Not yet integrated:         ${missing.length}`);
  console.log(`Forbidden cue phrases:      ${cuePhraseLeaks.length}`);
  console.log(`Malformed anchors:          ${malformedAnchors.length}`);

  if (missing.length > 0) {
    console.log("\nNeeds integration:");
    for (const r of missing) {
      const forms = r.anchorForms.join(", ");
      console.log(`  ${r.hanzi} (${r.pinyin}) [${forms}] "${r.story}"`);
    }
  }

  if (cuePhraseLeaks.length > 0) {
    console.log("\nForbidden phonetic cue phrase in story:");
    for (const r of cuePhraseLeaks) {
      console.log(`  ${r.hanzi} (${r.pinyin}) "${r.story}"`);
    }
  }

  if (malformedAnchors.length > 0) {
    console.log("\nMalformed soundAnchor (must be: Think of WORD.):");
    for (const r of malformedAnchors) {
      console.log(`  ${r.hanzi} (${r.pinyin}) "${r.soundAnchor}"`);
    }
  }

  if (failOnMissing && (missing.length > 0 || malformedAnchors.length > 0)) {
    process.exit(1);
  }
}

main();
