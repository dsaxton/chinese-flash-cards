#!/usr/bin/env node
const path = require("path");
const {
  collectDeckCards,
  getStoryText,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isLiteralShapeHint,
  readIndexHtml,
} = require("./mnemonic-quality-lib");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildSafeHint(card, options = {}) {
  const text = getStoryText(card);
  if (!text) return "";
  if (options.forbidPinyin && hintContainsPinyin(text, card.pinyin)) return "";
  if (options.forbidEnglishAnswer && hintContainsEnglishAnswer(text, card.english)) return "";
  if (options.forbidPhoneticCue && hintContainsPhoneticCue(text)) return "";
  if (options.forbidLiteralShapeHints && isLiteralShapeHint(text)) return "";
  return text.trim();
}

function main() {
  const root = path.resolve(__dirname, "..");
  const source = readIndexHtml(root);
  const { hsk1Cards } = collectDeckCards(source);

  for (const card of hsk1Cards) {
    const e2hHint = buildSafeHint(card, {
      forbidPinyin: true,
      forbidEnglishAnswer: true,
      forbidPhoneticCue: true,
      forbidLiteralShapeHints: true,
    });

    assert(
      !hintContainsEnglishAnswer(e2hHint, card.english),
      `E2H hint leaks English answer token for ${card.hanzi} (${card.english})`
    );
    assert(
      !hintContainsPinyin(e2hHint, card.pinyin),
      `E2H hint leaks pinyin token for ${card.hanzi} (${card.pinyin})`
    );
    assert(
      !hintContainsPhoneticCue(e2hHint),
      `E2H hint leaks phonetic cue phrase for ${card.hanzi}`
    );
    assert(
      !isLiteralShapeHint(e2hHint),
      `E2H hint leaks literal shape description for ${card.hanzi}`
    );

    const h2eHint = buildSafeHint(card, {
      forbidEnglishAnswer: true,
      forbidPhoneticCue: true,
    });

    assert(
      !hintContainsEnglishAnswer(h2eHint, card.english),
      `H2E hint leaks English answer token for ${card.hanzi} (${card.english})`
    );
    assert(
      !hintContainsPhoneticCue(h2eHint),
      `H2E hint leaks phonetic cue phrase for ${card.hanzi}`
    );
  }

  console.log(`hint safety test passed (${hsk1Cards.length} cards)`);
}

main();
