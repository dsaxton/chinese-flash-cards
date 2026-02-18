#!/usr/bin/env node
// scripts/apply-story-rewrites.js
//
// Applies LLM-generated story rewrites to data/deck-data.json.
// Searches both deck.vocab and deck.radicals for matching cards.
//
// Usage:
//   node scripts/apply-story-rewrites.js --input rewrites.json [--dry-run]
//
// Input format (rewrites.json):
//   [
//     { "hanzi": "爱",  "rewrittenStory": "He EYEs his friend, drawing them close." },
//     { "hanzi": "女儿", "rewrittenStory": "NEW life arrives, cherished as the daughter.",
//                        "rewrittenSoundAnchor": "Think of NEW." },
//     ...
//   ]
//
// rewrittenSoundAnchor is optional — only provide it when changing the anchor
// (e.g. simplifying a multi-word anchor to a single word).
//
// Validation: if a card has a soundAnchor and the new story does NOT contain
// that anchor word in ALL CAPS, the card is skipped (printed to stderr).
// The anchor used for validation is rewrittenSoundAnchor when provided,
// otherwise the card's existing soundAnchor.

const fs = require("fs");
const path = require("path");

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

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input") out.input = argv[++i];
    else if (argv[i] === "--dry-run") out.dryRun = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return out;
}

function applyToCardList(cards, rewriteMap, dryRun) {
  let applied = 0;
  let skipped = 0;

  for (const card of cards) {
    const rewrite = rewriteMap.get(card.hanzi);
    if (!rewrite) continue;

    const { newStory, newAnchor } = rewrite;

    // Determine which anchor to validate against
    const existingAnchor = String((card.mnemonicData || {}).soundAnchor || "").trim();
    const anchorForValidation = newAnchor || existingAnchor;
    const anchorWords = extractAnchorWords(anchorForValidation);

    // Only validate anchor presence if there IS an anchor to check
    if (anchorWords.length > 0 && !anchorIntegratedInStory(anchorWords, newStory)) {
      process.stderr.write(
        `SKIP ${card.hanzi} (${card.pinyin}): anchor [${anchorWords.join(", ")}]` +
        ` not found in ALL CAPS in story: "${newStory}"\n`
      );
      skipped++;
      continue;
    }

    if (!dryRun) {
      if (!card.mnemonicData) card.mnemonicData = {};
      card.mnemonicData.story = newStory;
      if (newAnchor !== undefined) {
        card.mnemonicData.soundAnchor = newAnchor;
      }
    } else {
      const anchorNote = newAnchor ? ` [anchor -> "${newAnchor}"]` : "";
      console.log(`[dry-run] ${card.hanzi}${anchorNote} -> "${newStory}"`);
    }
    applied++;
  }

  return { applied, skipped };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error("Usage: node scripts/apply-story-rewrites.js --input <file.json> [--dry-run]");
    process.exit(1);
  }

  const rewrites = JSON.parse(fs.readFileSync(args.input, "utf8"));

  // Build lookup: hanzi -> { newStory, newAnchor }
  const rewriteMap = new Map();
  for (const r of rewrites) {
    if (!r.hanzi || typeof r.rewrittenStory !== "string") continue;
    rewriteMap.set(r.hanzi, {
      newStory: r.rewrittenStory,
      newAnchor: typeof r.rewrittenSoundAnchor === "string" ? r.rewrittenSoundAnchor : undefined,
    });
  }

  const deckPath = path.resolve(__dirname, "..", "data", "deck-data.json");
  const deck = JSON.parse(fs.readFileSync(deckPath, "utf8"));

  const vocabResult = applyToCardList(deck.vocab || [], rewriteMap, args.dryRun);
  const radicalResult = applyToCardList(deck.radicals || [], rewriteMap, args.dryRun);

  const totalApplied = vocabResult.applied + radicalResult.applied;
  const totalSkipped = vocabResult.skipped + radicalResult.skipped;

  if (!args.dryRun) {
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2) + "\n");
    console.log(
      `Applied ${totalApplied} rewrites` +
      ` (vocab: ${vocabResult.applied}, radicals: ${radicalResult.applied}).` +
      ` Skipped ${totalSkipped} (validation failures).`
    );
  } else {
    console.log(
      `[dry-run] Would apply ${totalApplied} rewrites` +
      ` (vocab: ${vocabResult.applied}, radicals: ${radicalResult.applied}).` +
      ` Would skip ${totalSkipped}.`
    );
  }
}

main();
