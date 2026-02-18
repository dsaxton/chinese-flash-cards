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
  const configPath = path.join(root, "data", "phonetic-config.json");
  const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
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

function anchorIntegratedInStory(anchorWords, story) {
  const text = String(story || "");
  return anchorWords.every((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![A-Z\\-])${escaped}(?![A-Z\\-])`).test(text);
  });
}

function testMnemonicDataCoverage(cards, minNonEmpty) {
  for (const card of cards) {
    const label = `${card.hanzi} (${card.english})`;
    const hasSoundAnchor = Boolean(String(card.mnemonicData && card.mnemonicData.soundAnchor || "").trim());
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
    if (!hasSoundAnchor) {
      assert(!hintContainsEnglishAnswer(story, card.english), `${label}: story leaks English answer token`);
    }
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
  let integratedAnchorCount = 0;
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

    const anchorWords = extractAnchorWords(anchor);
    if (anchorWords.length > 0 && anchorIntegratedInStory(anchorWords, story)) {
      integratedAnchorCount++;
    }
  }

  assert(
    anchorCount >= minAnchors,
    `Expected at least ${minAnchors} HSK1 cards with sound anchors, got ${anchorCount}`
  );
  assert(
    integratedAnchorCount >= 75,
    `Expected at least 75 HSK1 sound anchors integrated into stories, got ${integratedAnchorCount}`
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

function testAnchorNarrativeRegressions(cards) {
  const byHanzi = new Map(cards.map((card) => [card.hanzi, card]));
  const checks = [
    { hanzi: "喂", mustContain: ["hello", "phone"], mustNotContain: ["crackles first"] },
    { hanzi: "会", mustContain: ["can"] },
    { hanzi: "回", mustContain: ["return"] },
    { hanzi: "块", mustContain: ["money"] },
  ];

  for (const check of checks) {
    const card = byHanzi.get(check.hanzi);
    assert(card, `Missing regression card ${check.hanzi}`);
    const story = getStoryText(card).toLowerCase();
    for (const token of check.mustContain || []) {
      assert(story.includes(token), `${check.hanzi}: expected story to include "${token}"`);
    }
    for (const token of check.mustNotContain || []) {
      assert(!story.includes(token), `${check.hanzi}: story should not include "${token}"`);
    }
  }
}

function testNoPlaceholderTemplateLanguage(cards) {
  const bannedPatterns = [
    /\bforms near the old gate\b/i,
    /\blantern smoke curls above stones beside a quiet gate\b/i,
    /\bmeets [a-z].* near the old gate\b/i,
  ];

  for (const card of cards) {
    const story = getStoryText(card);
    if (!story) continue;
    for (const pattern of bannedPatterns) {
      assert(
        !pattern.test(story),
        `${card.hanzi} (${card.english}): story uses banned placeholder template language`
      );
    }
  }
}

function testStoryWordCount(cards, maxWords) {
  for (const card of cards) {
    const story = getStoryText(card);
    if (!story) continue;
    const words = story.split(/\s+/).filter(Boolean).length;
    assert(
      words <= maxWords,
      `${card.hanzi} (${card.english}): story too long (${words} > ${maxWords})`
    );
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
  testAnchorNarrativeRegressions(hsk1Cards);
  testNoPlaceholderTemplateLanguage(hsk1Cards);
  testNoPlaceholderTemplateLanguage(radicals);
  testStoryWordCount(hsk1Cards, 12);
  testStoryWordCount(radicals, 12);

  console.log("mnemonic curation test passed");
}

main();
