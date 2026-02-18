#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const {
  collectDeckCards,
  getStoryText,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isLiteralShapeHint,
} = require("./mnemonic-quality-lib");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCanonicalSoundAnchor(anchor, cardLabel) {
  const text = String(anchor || "").trim();
  if (!text) return;
  assert(/^Think of [A-Z ,]+\.$/.test(text), `${cardLabel}: soundAnchor must be canonical ALL-CAPS phrase`);
  assert(!/\b(?:sounds?|sound)\s+like\b/i.test(text), `${cardLabel}: soundAnchor cannot use "sounds like"`);
}

function readAllowedAnchorWords() {
  const root = path.resolve(__dirname, "..");
  const mnemonicPath = path.join(root, "data", "mnemonic-data.json");
  const data = JSON.parse(fs.readFileSync(mnemonicPath, "utf8"));
  const values = Array.isArray(data.englishSoundAnchorWords) ? data.englishSoundAnchorWords : [];
  return new Set(values.map((value) => String(value).toUpperCase()));
}

function extractAnchorWords(anchor) {
  const body = String(anchor || "")
    .replace(/^Think of\s+/i, "")
    .replace(/[.?!]+$/, "")
    .trim();
  return body.match(/[A-Z]+/g) || [];
}

function testMnemonicDataCoverage(cards, minNonEmpty) {
  for (const card of cards) {
    const label = `${card.hanzi} (${card.english})`;
    assert(
      card.mnemonicData && typeof card.mnemonicData === "object",
      `${label}: missing mnemonicData object`
    );
    assert(
      Array.isArray(card.mnemonicData.components),
      `${label}: mnemonicData.components must be an array`
    );
    assertCanonicalSoundAnchor(card.mnemonicData.soundAnchor, label);

    const story = getStoryText(card);
    if (!story) continue;
    assert(!hintContainsEnglishAnswer(story, card.english), `${label}: story leaks English answer token`);
    assert(!hintContainsPinyin(story, card.pinyin), `${label}: story leaks pinyin token`);
    assert(!hintContainsPhoneticCue(story), `${label}: story uses forbidden phonetic cue phrasing`);
    assert(!isLiteralShapeHint(story), `${label}: story uses forbidden literal shape phrasing`);
  }

  const nonEmptyCount = cards.filter((card) => getStoryText(card).length > 0).length;
  assert(
    nonEmptyCount >= minNonEmpty,
    `Expected at least ${minNonEmpty} cards with non-empty compliant stories, got ${nonEmptyCount}`
  );
}

function testSoundAnchorBatch(cards, allowedWords, minAnchors) {
  let anchorCount = 0;
  for (const card of cards) {
    const label = `${card.hanzi} (${card.english})`;
    const anchor = String(card.mnemonicData && card.mnemonicData.soundAnchor || "").trim();
    const story = getStoryText(card);
    if (!anchor) continue;

    anchorCount++;
    assertCanonicalSoundAnchor(anchor, label);

    for (const word of extractAnchorWords(anchor)) {
      assert(allowedWords.has(word), `${label}: anchor word "${word}" is outside allowed English anchor set`);
    }

    assert(!hintContainsEnglishAnswer(anchor, card.english), `${label}: soundAnchor leaks English answer token`);

    const mergedHint = `${anchor} ${story}`.trim();
    assert(!hintContainsEnglishAnswer(mergedHint, card.english), `${label}: merged hint leaks English answer token`);
  }

  assert(
    anchorCount >= minAnchors,
    `Expected at least ${minAnchors} HSK1 cards with sound anchors, got ${anchorCount}`
  );
}

function testRadicalsFullyCurated(radicals) {
  for (const card of radicals) {
    const label = `${card.hanzi} (${card.english})`;
    assert(
      card.mnemonicData && typeof card.mnemonicData === "object",
      `${label}: radicals deck entries must use mnemonicData`
    );
    const story = getStoryText(card);
    assert(story.length > 0, `${label}: story must be non-empty`);
    assert(!hintContainsEnglishAnswer(story, card.english), `${label}: story leaks English answer token`);
    assert(!hintContainsPinyin(story, card.pinyin), `${label}: story leaks pinyin token`);
    assert(!hintContainsPhoneticCue(story), `${label}: story uses forbidden phonetic cue phrasing`);
    assert(!isLiteralShapeHint(story), `${label}: story uses forbidden literal shape phrasing`);
    assertCanonicalSoundAnchor(card.mnemonicData.soundAnchor, label);
  }
}

function main() {
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards, radicals } = collectDeckCards(root);
  const allowedAnchorWords = readAllowedAnchorWords();

  testMnemonicDataCoverage(hsk1Cards, 25);
  testSoundAnchorBatch(hsk1Cards, allowedAnchorWords, 80);
  testMnemonicDataCoverage(radicals, radicals.length);
  testRadicalsFullyCurated(radicals);

  console.log("mnemonic curation test passed");
}

main();
