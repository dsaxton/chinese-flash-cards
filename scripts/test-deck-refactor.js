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

  const stage1Start = branch.indexOf("if (stage >= 1) {");
  assert(stage1Start !== -1, "Missing stage 1 block for English->Hanzi");
  const stage2Start = branch.indexOf("if (stage >= 2) {", stage1Start);
  assert(stage2Start !== -1, "Missing stage 2 block for English->Hanzi");
  const stage1Block = branch.slice(stage1Start, stage2Start);
  assert(
    !stage1Block.includes("related-radicals"),
    "English->Hanzi stage 1 should not reveal radical chips"
  );
  assert(
    stage1Block.includes("includeSoundAnchor: true"),
    "English->Hanzi stage 1 should include a sound anchor in the English hint"
  );
  assert(
    stage1Block.includes("includeChips: false"),
    "English->Hanzi stage 1 should hide component chips"
  );
  assert(
    stage1Block.includes("forbidPinyin: true"),
    "English->Hanzi stage 1 should sanitize pinyin from mnemonic hint text"
  );
  assert(
    stage1Block.includes("forbidLiteralShapeHints: true"),
    "English->Hanzi stage 1 should suppress literal shape-description hints"
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

function testStructuredMnemonicPipeline(source) {
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
    /function isIntelligibleEnglishAnchorPhrase\(phrase\)/.test(source),
    "Missing isIntelligibleEnglishAnchorPhrase guard"
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
  testLiteralShapeHintGuardrails(source);
  testStructuredMnemonicPipeline(source);

  console.log("deck refactor regression test passed");
}

main();
