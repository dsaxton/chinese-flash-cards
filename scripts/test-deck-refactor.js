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

function extractConstArray(source, name) {
  const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  return eval(`([${match[1]}])`);
}

function extractConstObject(source, name) {
  const re = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  return eval(`({${match[1]}})`);
}

function extractConstNumber(source, name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+);`));
  if (!match) throw new Error(`Could not find const ${name}`);
  return Number(match[1]);
}

function testDeckData(source) {
  const hsk1CardCount = extractConstNumber(source, "HSK1_CARD_COUNT");
  assert(hsk1CardCount === 143, `HSK1_CARD_COUNT should be 143, got ${hsk1CardCount}`);
  assert(
    /const HSK1_VOCAB = VOCAB\.slice\(0, HSK1_CARD_COUNT\);/.test(source),
    "HSK1_VOCAB should be defined as VOCAB.slice(0, HSK1_CARD_COUNT)"
  );

  const radicals = extractConstArray(source, "RADICAL_DECK_CARDS");
  assert(radicals.length >= 30, `Expected >= 30 radical deck cards, got ${radicals.length}`);
  for (const [i, card] of radicals.entries()) {
    const id = `RADICAL_DECK_CARDS[${i}]`;
    assert(typeof card.id === "string" && card.id, `${id} missing id`);
    assert(typeof card.hanzi === "string" && card.hanzi, `${id} missing hanzi`);
    assert(typeof card.pinyin === "string" && card.pinyin, `${id} missing pinyin`);
    assert(typeof card.english === "string" && card.english, `${id} missing english`);
    assert(typeof card.mnemonic === "string" && card.mnemonic, `${id} missing mnemonic`);
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
  assert(!/\["review", "pinyin", "radicals"\]/.test(source), "Old review/pinyin/radicals route set still found");
}

function testEnglishToHanziHintStage(source) {
  const branchStart = source.indexOf("if (isEnglishToHanzi) {");
  assert(branchStart !== -1, "Missing isEnglishToHanzi render branch");
  const branchEnd = source.indexOf("} else {", branchStart);
  assert(branchEnd !== -1, "Could not find end of isEnglishToHanzi branch");
  const branch = source.slice(branchStart, branchEnd);

  assert(
    /if \(stage >= 1 && hintMnemonic\.text\)/.test(branch),
    "English->Hanzi hint should remain visible from stage 1 onward"
  );
  assert(
    /if \(stage >= 2 && stage < finalStage\)/.test(branch),
    "English->Hanzi pinyin stage should appear at stage 2 before final reveal"
  );
  assert(
    /if \(stage >= finalStage\)/.test(branch),
    "English->Hanzi should have a final reveal block"
  );
  assert(
    !/if \(stage === 1\)/.test(branch),
    "English->Hanzi should not use stage-equality gating that drops prior info"
  );
  assert(
    branch.includes("includeSoundAnchor: false"),
    "English->Hanzi hint should disable sound-anchor phonetic clues"
  );
  assert(
    branch.includes("includeChips: false"),
    "English->Hanzi hint should hide component chips"
  );
  assert(
    branch.includes("forbidPinyin: true"),
    "English->Hanzi hint should sanitize pinyin from mnemonic hint text"
  );
  assert(
    branch.includes("forbidEnglishAnswer: true"),
    "English->Hanzi hint should sanitize English-answer leakage from hints"
  );
  assert(
    branch.includes("forbidPhoneticCue: true"),
    "English->Hanzi hint should sanitize phonetic-cue phrasing from hints"
  );
  assert(
    branch.includes("forbidLiteralShapeHints: true"),
    "English->Hanzi hint should suppress literal shape-description hints"
  );
  assert(
    branch.includes("class=\"pinyin\""),
    "English->Hanzi stage 2 should include a pinyin reveal"
  );
  assert(
    branch.includes("class=\"hanzi\""),
    "English->Hanzi final stage should include hanzi reveal"
  );
  assert(
    branch.includes("related-radicals"),
    "English->Hanzi final stage should include component chips"
  );
}

function testHanziToEnglishIntermediateMnemonicStage(source) {
  const elseStart = source.indexOf("} else {");
  assert(elseStart !== -1, "Missing non-English->Hanzi render branch");
  const branchEnd = source.indexOf("\n    if (stage >= finalStage) {", elseStart);
  assert(branchEnd !== -1, "Could not locate end of non-English->Hanzi branch");
  const branch = source.slice(elseStart, branchEnd);

  const stage2Start = branch.indexOf("if (isHanziToEnglish && stage >= 2");
  assert(stage2Start !== -1, "Missing Hanzi->English stage 2 mnemonic-only block");
  const stage2Block = branch.slice(stage2Start, branch.indexOf("if (stage >= finalStage) {", stage2Start));
  assert(
    /const hintMnemonic = isHanziToEnglish[\s\S]*includeSoundAnchor: false/.test(branch),
    "Hanzi->English stage 2 hint should disable sound-anchor phonetic clues"
  );
  assert(
    /const hintMnemonic = isHanziToEnglish[\s\S]*includeChips: false/.test(branch),
    "Hanzi->English stage 2 should render mnemonic without chips"
  );
  assert(
    /const hintMnemonic = isHanziToEnglish[\s\S]*forbidEnglishAnswer: true/.test(branch),
    "Hanzi->English stage 2 should sanitize English-answer leakage"
  );
  assert(
    /const hintMnemonic = isHanziToEnglish[\s\S]*forbidPhoneticCue: true/.test(branch),
    "Hanzi->English stage 2 should sanitize phonetic-cue phrasing"
  );
  assert(
    !stage2Block.includes("class=\"english\""),
    "Hanzi->English stage 2 should not reveal English yet"
  );
  assert(
    !/if \(isHanziToEnglish && stage === 2\)/.test(branch),
    "Hanzi->English should not use stage-equality gating that drops prior info"
  );
}

function testFinalStageFlow(source) {
  assert(
    /const finalStage = isHanziToEnglish \|\| isEnglishToHanzi \? 3 : 2;/.test(source),
    "finalStage should be 3 for Hanzi->English and English->Hanzi, else 2"
  );
  assert(
    /if \(stage >= finalStage\) \{[\s\S]*difficulty-buttons/.test(source),
    "Difficulty buttons should appear only at final stage"
  );
  assert(
    /if \(stage < finalStage\) \{[\s\S]*const hints =/.test(source),
    "Tap hints should be shown only before final stage"
  );
  assert(
    /if \(stage < finalStage\) \{[\s\S]*addEventListener\("click"/.test(source),
    "Card click-to-advance should stop at final stage"
  );
  assert(
    /\["tap to reveal mnemonic hint", "tap to reveal pinyin", "tap to reveal hanzi \+ full reveal"\]/.test(source),
    "English->Hanzi should define 3 hint stages"
  );
  assert(
    /\["tap to reveal pinyin", "tap to reveal mnemonic hint", "tap to reveal meaning"\]/.test(source),
    "Hanzi->English should define 3 hint stages"
  );
}

function testStageSkipLogic(source) {
  assert(
    /if \(isEnglishToHanzi && stage === 1\) \{[\s\S]*includeSoundAnchor: false,[\s\S]*forbidPinyin: true,[\s\S]*forbidEnglishAnswer: true,[\s\S]*forbidPhoneticCue: true,[\s\S]*forbidLiteralShapeHints: true,[\s\S]*if \(!hint\.text\) stage\+\+;[\s\S]*\}/.test(source),
    "English->Hanzi should skip empty stage-1 mnemonic hint"
  );
  assert(
    /if \(isEnglishToHanzi && stage === 2 && pinyinToAudioKeys\(card\.pinyin\)\.length === 0\) \{\s*stage\+\+;[\s\S]*\}/.test(source),
    "English->Hanzi should skip stage-2 pinyin-only reveal when no playable pinyin keys exist"
  );
  assert(
    /if \(isHanziToEnglish && stage === 2\) \{[\s\S]*includeSoundAnchor: false,[\s\S]*includeChips: false,[\s\S]*forbidEnglishAnswer: true,[\s\S]*forbidPhoneticCue: true,[\s\S]*if \(!hint\.text\) stage\+\+;[\s\S]*\}/.test(source),
    "Hanzi->English should skip empty stage-2 mnemonic hint"
  );
}

function testProgressiveRevealMonotonic(source) {
  assert(
    /if \(stage >= 1 && hintMnemonic\.text\)/.test(source),
    "Progressive reveal: E2H hint should remain visible once revealed"
  );
  assert(
    /if \(isHanziToEnglish && stage >= 2 && hintMnemonic && hintMnemonic\.text\)/.test(source),
    "Progressive reveal: H2E hint should remain visible once revealed"
  );
  assert(
    /if \(stage >= 1\) \{[\s\S]*class="pinyin"/.test(source),
    "Progressive reveal: pinyin shown at stage 1 should persist through later H2E stages"
  );
  assert(
    /if \(stage >= finalStage\) \{[\s\S]*class="pinyin"[\s\S]*class="mnemonic"/.test(source),
    "Progressive reveal: final stage should include accumulated reveal information"
  );
}

function testLiteralShapeHintGuardrails(source) {
  const literalBlockMatch = source.match(/const LITERAL_SHAPE_HINT_PATTERNS = \[([\s\S]*?)\n\];/);
  assert(literalBlockMatch, "Missing LITERAL_SHAPE_HINT_PATTERNS");
  const block = literalBlockMatch[1];
  const requiredTokens = [
    "looks like",
    "shape",
    "stroke",
    "line",
    "hook",
    "vertical",
    "horizontal",
  ];
  for (const token of requiredTokens) {
    assert(
      block.includes(token),
      `LITERAL_SHAPE_HINT_PATTERNS should include a guard for "${token}"`
    );
  }
  assert(
    /if \(forbidLiteralShapeHints && isLiteralShapeHint\(story\)\) story = "";\s*/.test(source),
    "Mnemonic builder should drop literal shape hints when forbidLiteralShapeHints is enabled"
  );
}

function testHintSafetyHelpers(source) {
  assert(
    /function extractEnglishAnswerTokens\(english\)/.test(source),
    "Missing extractEnglishAnswerTokens helper"
  );
  assert(
    /function hintContainsEnglishAnswer\(text, english\)/.test(source),
    "Missing hintContainsEnglishAnswer helper"
  );
  assert(
    /function hintContainsPhoneticCue\(text\)/.test(source),
    "Missing hintContainsPhoneticCue helper"
  );
  assert(
    /function hintContainsPinyin\(text, pinyin\)/.test(source),
    "Missing hintContainsPinyin helper"
  );
  assert(
    /if \(forbidPinyin && hintContainsPinyin\(story, card\.pinyin\)\) story = "";/.test(source),
    "Mnemonic builder should reject hints containing pinyin when forbidPinyin is enabled"
  );
  assert(
    /if \(forbidEnglishAnswer && hintContainsEnglishAnswer\(story, card\.english\)\) story = "";/.test(source),
    "Mnemonic builder should reject hints containing English answer leakage when forbidEnglishAnswer is enabled"
  );
  assert(
    /if \(forbidPhoneticCue && hintContainsPhoneticCue\(story\)\) story = "";/.test(source),
    "Mnemonic builder should reject hints containing phonetic-cue phrasing when forbidPhoneticCue is enabled"
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
    /function buildIntelligibleAnchorPhrase\(words\)/.test(source),
    "Missing buildIntelligibleAnchorPhrase helper"
  );
  assert(
    /const upperWords = words\.map\(\(word\) => word\.toUpperCase\(\)\);/.test(source),
    "Sound-anchor words should be normalized to ALL CAPS"
  );
  assert(
    /return `Think of \$\{words\.join\(", then "\)\}\.`;/.test(source),
    "Sound anchor should be rendered as an intelligible English phrase"
  );
  assert(
    /^.*if \(!parts\.every\(\(part\) => isEnglishAnchorWord\(part\)\)\) return "";.*$/m.test(source),
    "Sound anchors must be English words only (no pronunciation fragments)"
  );
  assert(
    /const soundAnchor = canonicalizeSoundAnchorPhrase\(raw\.soundAnchor\);/.test(source),
    "Structured mnemonicData sound anchors should be canonicalized"
  );
  assert(
    /const anchor = canonicalizeSoundAnchorPhrase\(soundAnchor\);/.test(source),
    "mergeSoundAnchorAndStory should canonicalize sound anchors before rendering"
  );
  assert(
    /const anchorPattern = new RegExp\(escapedAnchor, "i"\);/.test(source),
    "mergeSoundAnchorAndStory should replace non-canonical case variants with canonical ALL-CAPS anchor"
  );
  assert(
    !/Sounds like:/.test(source),
    "Explicit \"Sounds like:\" phrasing is not allowed in mnemonic rendering"
  );
}

function main() {
  const root = path.resolve(__dirname, "..");
  const source = readIndexHtml(root);

  testDeckData(source);
  testStorageKeysAndMigration(source);
  testRoutes(source);
  testEnglishToHanziHintStage(source);
  testHanziToEnglishIntermediateMnemonicStage(source);
  testFinalStageFlow(source);
  testStageSkipLogic(source);
  testProgressiveRevealMonotonic(source);
  testLiteralShapeHintGuardrails(source);
  testHintSafetyHelpers(source);
  testStructuredMnemonicPipeline(source);

  console.log("deck refactor regression test passed");
}

main();
