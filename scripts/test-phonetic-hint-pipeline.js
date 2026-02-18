#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { generatePhoneticHints } = require("./build-phonetic-hints");

function runBuildScript(outputPath) {
  const root = path.resolve(__dirname, "..");
  const fixtureDir = path.join(root, "scripts", "fixtures", "phonetic");
  generatePhoneticHints({
    makeMeAHanzi: path.join(fixtureDir, "make-me-a-hanzi.txt"),
    unihan: path.join(fixtureDir, "unihan-readings.txt"),
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
  assert(Array.isArray(maEntry.phoneticProfile.unihanFamily), "吗 should include unihanFamily array");

  console.log("phonetic hint pipeline test passed");
}

main();
