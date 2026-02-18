#!/usr/bin/env node
// scripts/export-problem-stories.js
//
// Exports Phase 1 problem cards for LLM rewriting:
//   1a. broken/fragment stories (4 HSK1)
//   1b. answer leakers not caught by current audit (3 HSK1)
//   1c. side-form radical context descriptions (8 radicals)
//   1d. multi-anchor concatenations (6 HSK1)
//
// Each entry includes hanzi, pinyin, english, components, current story,
// soundAnchor, issueType, and issueDetail.
//
// Usage:
//   node scripts/export-problem-stories.js > work/phase1-input.json
//
// LLM output format (work/phase1-output.json):
//   [
//     { "hanzi": "朋友", "rewrittenStory": "Two open hands reach toward each other." },
//     { "hanzi": "女儿", "rewrittenSoundAnchor": "Think of NEW.", "rewrittenStory": "NEW life arrives, cherished as the child of the house." },
//     ...
//   ]
//
// rewrittenSoundAnchor is only required for issueType "multi_anchor" cards.
// apply-story-rewrites.js will handle both fields.

const path = require("path");
const { collectDeckCards, getStoryText } = require("./mnemonic-quality-lib");

// ── 1a: Broken / fragment stories ──────────────────────────────────────────

function isBrokenStory(story) {
  if (!story) return false;
  // double space (artifact from bad concat)
  if (/  /.test(story)) return true;
  // trailing " ." or "! ."
  if (/[!?]\s+\.$/.test(story)) return true;
  // starts with lowercase letter
  if (/^[a-z]/.test(story.trim())) return true;
  return false;
}

// ── 1b: Known answer leakers (stopword and plural blind spots) ───────────────

const KNOWN_LEAKER_HANZI = new Set(["很", "太", "分钟"]);

// ── 1c: Side-form context descriptions ──────────────────────────────────────

function isContextDescription(story) {
  return /compact component|flank marker|appears in (characters|actions|terms|many|words)/i.test(story);
}

// ── 1d: Multi-anchor concatenations ─────────────────────────────────────────

function isMultiAnchor(soundAnchor) {
  if (!soundAnchor) return false;
  // "Think of A, B." or "Think of A, B, C." or "Think of A and B."
  return /,|and\s+[A-Z]/.test(soundAnchor);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function cardEntry(card, issueType, issueDetail) {
  const md = card.mnemonicData || {};
  return {
    hanzi: card.hanzi,
    pinyin: card.pinyin,
    english: card.english,
    components: Array.isArray(md.components) ? md.components : [],
    currentStory: getStoryText(card),
    soundAnchor: String(md.soundAnchor || "").trim() || null,
    legacyMnemonic: (card.mnemonic || "").trim() || null,
    issueType,
    issueDetail,
  };
}

function main() {
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards, radicals } = collectDeckCards(root);

  const rows = [];
  const seen = new Set();

  function add(card, issueType, issueDetail) {
    if (seen.has(card.hanzi)) return; // avoid duplicates if card hits multiple issues
    seen.add(card.hanzi);
    rows.push(cardEntry(card, issueType, issueDetail));
  }

  // 1a: broken fragments (HSK1)
  for (const card of hsk1Cards) {
    const story = getStoryText(card);
    if (story && isBrokenStory(story)) {
      add(card, "broken_fragment", "malformed story text");
    }
  }

  // 1b: known leakers (HSK1)
  for (const card of hsk1Cards) {
    if (KNOWN_LEAKER_HANZI.has(card.hanzi)) {
      add(card, "answer_leak", "answer word present but bypasses audit");
    }
  }

  // 1c: context descriptions (radicals)
  for (const card of radicals) {
    const story = getStoryText(card);
    if (story && isContextDescription(story)) {
      add(card, "context_description", "describes usage context, not imagery");
    }
  }

  // 1d: multi-anchor concatenations (HSK1)
  for (const card of hsk1Cards) {
    const sa = String((card.mnemonicData || {}).soundAnchor || "").trim();
    if (isMultiAnchor(sa)) {
      add(card, "multi_anchor", "soundAnchor lists multiple words — simplify to one");
    }
  }

  console.log(JSON.stringify(rows, null, 2));
  process.stderr.write(
    `Exported ${rows.length} phase-1 problem cards` +
    ` (broken: ${rows.filter(r => r.issueType === "broken_fragment").length},` +
    ` leakers: ${rows.filter(r => r.issueType === "answer_leak").length},` +
    ` context_desc: ${rows.filter(r => r.issueType === "context_description").length},` +
    ` multi_anchor: ${rows.filter(r => r.issueType === "multi_anchor").length}).\n`
  );
}

main();
