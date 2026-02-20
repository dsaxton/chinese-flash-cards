#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readIndexHtml(rootDir) {
  const htmlPath = path.join(rootDir, "index.html");
  return fs.readFileSync(htmlPath, "utf8");
}

function extractConstObject(source, name) {
  const re = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  return eval(`({${match[1]}})`);
}

function readDeckData(rootDir) {
  const jsonPath = path.join(rootDir, "data", "deck-data.json");
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function testDeckData(source, deckData) {
  const hsk1CardCount = Number(deckData.hsk1CardCount || 0);
  assert(hsk1CardCount === 143, `HSK1_CARD_COUNT should be 143, got ${hsk1CardCount}`);
  assert(
    /const HSK1_VOCAB = VOCAB\.slice\(0, HSK1_CARD_COUNT\);/.test(source),
    "HSK1_VOCAB should be defined as VOCAB.slice(0, HSK1_CARD_COUNT)"
  );

  const radicals = Array.isArray(deckData.radicals) ? deckData.radicals : [];
  assert(radicals.length >= 30, `Expected >= 30 radical deck cards, got ${radicals.length}`);
  for (const [i, card] of radicals.entries()) {
    const id = `RADICAL_DECK_CARDS[${i}]`;
    assert(typeof card.id === "string" && card.id, `${id} missing id`);
    assert(typeof card.hanzi === "string" && card.hanzi, `${id} missing hanzi`);
    assert(typeof card.pinyin === "string" && card.pinyin, `${id} missing pinyin`);
    assert(typeof card.english === "string" && card.english, `${id} missing english`);
    assert(typeof card.mnemonic === "string", `${id} missing mnemonic`);
    assert(card.mnemonicData && typeof card.mnemonicData === "object", `${id} missing mnemonicData`);
  }
}

function testStorageKeysAndMigration(source) {
  const keys = extractConstObject(source, "DECK_STORAGE_KEYS");
  assert(
    keys.hanzi_to_english === "hanzi_to_english_progress",
    `Unexpected hanzi_to_english storage key: ${keys.hanzi_to_english}`
  );
  assert(
    keys.english_to_hanzi === "english_to_hanzi_progress",
    `Unexpected english_to_hanzi storage key: ${keys.english_to_hanzi}`
  );
  assert(
    keys.radicals_to_english === "radicals_to_english_progress",
    `Unexpected radicals_to_english storage key: ${keys.radicals_to_english}`
  );

  assert(
    /function migrateLegacyProgress\(\) \{[\s\S]*saveDeckProgress\("hanzi_to_english", legacy\);[\s\S]*\}/.test(
      source
    ),
    "migrateLegacyProgress should copy legacy progress into hanzi_to_english deck storage"
  );
}

function testRoutes(source) {
  assert(
    /const route = \["decks", "study"\]\.includes\(path\) \? path : "decks";/.test(source),
    "parseRoute should only allow decks/study routes"
  );
}

function testUniversalStageFlow(source) {
  assert(/const finalStage = 2;/.test(source), "finalStage should be fixed at 2 for universal 3-step flow");
  assert(
    /const hints = \["tap to reveal pinyin", "tap to reveal full answer"\];/.test(source),
    "All decks should use one shared hint sequence"
  );
  assert(
    /if \(stage >= 1\) \{[\s\S]*class="pinyin"/.test(source),
    "Stage 1 should reveal pinyin/audio for all decks"
  );
  assert(
    /if \(stage >= finalStage\) \{[\s\S]*class="mnemonic"[\s\S]*related-radicals/.test(source),
    "Final stage should reveal mnemonic and chips"
  );
  assert(
    /if \(stage >= finalStage\) \{[\s\S]*class="cultural-tidbit"/.test(source),
    "Final stage should include tidbit block when available"
  );
  assert(
    /if \(isEnglishToHanzi\) \{[\s\S]*class="english"[\s\S]*\} else \{[\s\S]*class="hanzi"/.test(source),
    "Prompt stage should branch by deck mode"
  );
  assert(
    /if \(isEnglishToHanzi\) \{[\s\S]*class="hanzi"[\s\S]*\} else \{[\s\S]*class="english"/.test(source),
    "Final reveal should show the opposite side of the prompt"
  );
}

function testTidbitTokenCoverageIncludesRadicals(source) {
  assert(
    /const ALL_TIDBIT_CARDS = \[\.\.\.HSK1_VOCAB, \.\.\.RADICAL_DECK_CARDS\];/.test(source),
    "Tidbit token maps should include radicals and HSK1 cards"
  );
  assert(
    /ALL_TIDBIT_CARDS\.map\(\(card\) => \[card\.hanzi, extractMeaningTokens\(card\.english\)\]\)/.test(source) &&
      /ALL_TIDBIT_CARDS\.map\(\(card\) => \[card\.hanzi, extractRawMeaningTokens\(card\.english\)\]\)/.test(source),
    "Tidbit token maps should be derived from ALL_TIDBIT_CARDS"
  );
}

function testRemovedHintStageLogic(source) {
  const forbiddenPatterns = [
    /forbidPinyin/,
    /forbidLiteralShapeHints/,
    /forbidEnglishAnswer/,
    /forbidPhoneticCue/,
    /hintContainsPinyin\(/,
    /hintContainsEnglishAnswer\(/,
    /hintContainsPhoneticCue\(/,
    /isLiteralShapeHint\(/,
    /tap to reveal mnemonic hint/,
    /if \(isEnglishToHanzi && stage === 1\)/,
    /if \(isHanziToEnglish && stage === 2\)/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert(!pattern.test(source), `Old mnemonic hint stage logic should be removed (${pattern})`);
  }
}

function testNoSelfReferentialChips(source) {
  assert(
    /const filtered = chips\.filter\(\(item\) => item\.hanzi !== card\.hanzi\);/.test(source),
    "buildMnemonicAndChips should filter out self-referential chips"
  );
}

function testRadicalSideFormDisplaySupport(source) {
  assert(
    /const RADICAL_SIDE_FORM_FULL_FORM = \{[\s\S]*"讠": "言"[\s\S]*"扌": "手"[\s\S]*"阝": "阜"[\s\S]*\};/.test(source),
    "Radical side-form mapping should include full-form references"
  );
  assert(
    /function getRadicalSideFormFullForm\(deck, card\) \{[\s\S]*deck\.mode !== "radicals_to_english"[\s\S]*RADICAL_SIDE_FORM_FULL_FORM\[card\.hanzi\] \|\| "";[\s\S]*\}/.test(source),
    "Side-form helper should return full-form reference for radicals deck cards"
  );
  assert(
    /const RADICAL_SIDE_FORM_SHIFT = \{[\s\S]*"阝": "0\.16em"[\s\S]*\};/.test(source),
    "Side-form mapping should include optical centering shifts"
  );
  assert(
    /function getRadicalSideFormShift\(deck, card\) \{[\s\S]*deck\.mode !== "radicals_to_english"[\s\S]*RADICAL_SIDE_FORM_SHIFT\[card\.hanzi\] \|\| "";[\s\S]*\}/.test(source),
    "Side-form shift helper should return per-glyph optical centering offset"
  );
  assert(
    /class="hanzi">\$\{escapeHtml\(card\.hanzi\)\}<\/div>/.test(source) &&
      /class="radical-side-glyph" style="--side-shift:\$\{escapeHtml\(sideFormShift\)\}">\$\{escapeHtml\(card\.hanzi\)\}<\/span>/.test(source) &&
      /if \(sideFormFullForm\) \{[\s\S]*class="radical-side-note">side form of \$\{escapeHtml\(sideFormFullForm\)\}<\/div>/.test(source),
    "Radical side-form cards should apply optical centering and show a full-form note below"
  );
}

function testStructuredMnemonicPipeline(source) {
  assert(
    /function canonicalizeSoundAnchorPhrase\(phrase\)/.test(source),
    "Missing canonicalizeSoundAnchorPhrase helper"
  );
  assert(
    /function normalizeMnemonicData\(card\)/.test(source),
    "Missing normalizeMnemonicData(card) helper"
  );
  assert(
    /const raw = card\.mnemonicData;/.test(source),
    "normalizeMnemonicData should support structured card.mnemonicData"
  );
  assert(
    /function mergeSoundAnchorAndStory\(soundAnchor, story\)/.test(source),
    "Missing mergeSoundAnchorAndStory helper"
  );
  assert(
    /const upperWords = words\.map\(\(word\) => word\.toUpperCase\(\)\);/.test(source),
    "Sound-anchor words should be normalized to ALL CAPS"
  );
  assert(
    !/Sounds like:/.test(source),
    "Explicit \"Sounds like:\" phrasing is not allowed in mnemonic rendering"
  );
}

function testAudioFallbackIsSingleShot(source) {
  const pattern =
    /function speak\(hanzi\) \{[\s\S]*AUDIO_MANIFEST\[hanzi\][\s\S]*new Audio\(`\.\/data\/audio\/\$\{filename\}`\)[\s\S]*audio\.play\(\)\.catch\(\(\) => \{\}\);[\s\S]*\}/;
  assert(pattern.test(source), "speak() should play the local audio file without pinyin fallback");
  assert(!/fallbackToPinyin/.test(source), "speak() should not include pinyin fallback logic");
}

function testRadicalsUsePinyinAudio(source) {
  assert(
    /if \(deck\.mode === "radicals_to_english"\) speakPinyin\(card\.pinyin\);\s*else speak\(card\.hanzi\);/.test(source),
    "Radicals deck speaker should use direct pinyin syllable audio instead of character file audio"
  );
}

function main() {
  const root = path.resolve(__dirname, "..");
  const source = readIndexHtml(root);
  const deckData = readDeckData(root);

  testDeckData(source, deckData);
  testStorageKeysAndMigration(source);
  testRoutes(source);
  testUniversalStageFlow(source);
  testTidbitTokenCoverageIncludesRadicals(source);
  testRemovedHintStageLogic(source);
  testNoSelfReferentialChips(source);
  testRadicalSideFormDisplaySupport(source);
  testStructuredMnemonicPipeline(source);
  testAudioFallbackIsSingleShot(source);
  testRadicalsUsePinyinAudio(source);

  console.log("deck refactor regression test passed");
}

main();
