#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/sentence-data.json"), "utf8"));
const deckData = JSON.parse(fs.readFileSync(path.join(root, "data/deck-data.json"), "utf8"));

const hsk1Vocab = new Set(
  deckData.vocab.slice(0, deckData.hsk1CardCount).map((c) => c.hanzi)
);

const sentences = data.sentences;
const errors = [];
const ids = new Set();

for (const [i, sent] of sentences.entries()) {
  const label = `sentence#${i + 1} (${sent.id || "??"})`;

  if (!sent.id || typeof sent.id !== "string") {
    errors.push(`${label}: missing or invalid id`);
  } else if (ids.has(sent.id)) {
    errors.push(`${label}: duplicate id "${sent.id}"`);
  } else {
    ids.add(sent.id);
  }

  if (!sent.hanzi || typeof sent.hanzi !== "string") {
    errors.push(`${label}: missing hanzi`);
  }
  if (!sent.pinyin || typeof sent.pinyin !== "string") {
    errors.push(`${label}: missing pinyin`);
  }
  if (!sent.english || typeof sent.english !== "string") {
    errors.push(`${label}: missing english`);
  }

  if (!Array.isArray(sent.vocabWords) || sent.vocabWords.length === 0) {
    errors.push(`${label}: vocabWords must be a non-empty array`);
  } else {
    for (const [j, word] of sent.vocabWords.entries()) {
      const wLabel = `${label} word#${j + 1}`;
      if (!word.hanzi) errors.push(`${wLabel}: missing hanzi`);
      if (!word.pinyin) errors.push(`${wLabel}: missing pinyin`);
      if (!word.english) errors.push(`${wLabel}: missing english`);
    }
  }
}

const vocabCoverage = sentences.reduce((count, sent) => {
  const allHsk1 = (sent.vocabWords || []).every((w) => hsk1Vocab.has(w.hanzi));
  return count + (allHsk1 ? 1 : 0);
}, 0);
const coveragePct = ((vocabCoverage / sentences.length) * 100).toFixed(1);

if (errors.length > 0) {
  console.error("sentence data validation failed:");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`sentence data validation passed (${sentences.length} sentences)`);
console.log(`HSK1-only vocab coverage: ${vocabCoverage}/${sentences.length} (${coveragePct}%)`);
