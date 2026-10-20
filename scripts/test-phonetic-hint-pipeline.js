#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { generatePhoneticHints } = require("./build-phonetic-hints");
const { parseUnihanKPhonetic } = require("./phonetic-hint-lib");

function runBuildScript(outputPath) {
  const root = path.resolve(__dirname, "..");
  const fixtureDir = path.join(root, "scripts", "fixtures", "phonetic");
  generatePhoneticHints({
    makeMeAHanzi: path.join(fixtureDir, "make-me-a-hanzi.txt"),
    unihan: path.join(fixtureDir, "unihan-dictionary-like-data.txt"),
    cedict: path.join(fixtureDir, "cedict-sample.u8"),
    out: outputPath,
  });
}

function findEntry(data, hanzi) {
  return data.entries.find((entry) => entry.hanzi === hanzi);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "phonetic-pipeline-"));
  const outFile = path.join(tempDir, "hsk1-phonetic-hints.json");

  runBuildScript(outFile);

  const raw = fs.readFileSync(outFile, "utf8");
  const data = JSON.parse(raw);

  assert(Array.isArray(data.entries), "output must include entries[]");
  assert(data.entries.length === data.hsk1UniqueCharCount, "entries should cover all HSK1 unique characters");

  const goodEntry = findEntry(data, "好");
  assert(goodEntry, "expected 好 entry from fixtures");
  assert(Array.isArray(goodEntry.pinyin) && goodEntry.pinyin.length > 0, "好 should include pinyin candidates");
  assert(goodEntry.pinyinSources.includes("deck") || goodEntry.pinyinSources.includes("cedict"), "好 should have a pinyin source");
  assert(goodEntry.phoneticProfile.makeMeAHanzi.phonetic === "子", "好 should include MMH phonetic component");
  assert(Array.isArray(goodEntry.candidates) && goodEntry.candidates.length > 0, "好 should have candidate rows");

  const firstSuggestion = goodEntry.candidates.find((row) => row.suggestion);
  assert(firstSuggestion, "好 should produce at least one anchor suggestion");
  assert(/^Think of [A-Z]+\.$/.test(firstSuggestion.suggestion), "suggestion must be canonical single-word ALL CAPS phrase");

  const maEntry = findEntry(data, "吗");
  assert(maEntry, "expected 吗 entry from fixtures");
  const maFamily = maEntry.phoneticProfile.unihanFamily;
  assert(maFamily.includes("马") && maFamily.includes("妈"), "吗 should share a kPhonetic class with 马 and 妈");
  assert(!maFamily.includes("吗"), "吗 should not list itself in its unihanFamily");
  assert(goodEntry.phoneticProfile.unihanFamily.includes("子"), "好 should share a kPhonetic class with 子");

  // kPhonetic values are Casey class numbers with optional A-D subclass and "*" suffixes.
  const families = parseUnihanKPhonetic("U+570B\tkPhonetic\t748 1416\nU+8753\tkPhonetic\t1416*\nU+4E4D\tkPhonetic\t10A\nU+4E8C\tkPhonetic\t10");
  assert.deepStrictEqual(families.get("國"), ["蝓"], "classes split on spaces and ignore the * suffix");
  assert.deepStrictEqual(families.get("乍"), [], "subclass 10A is distinct from class 10");

  console.log("phonetic hint pipeline test passed");
}

main();
