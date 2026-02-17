#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  getStoryText,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isLiteralShapeHint,
} = require("./mnemonic-quality-lib");

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeSource(filePath, source) {
  fs.writeFileSync(filePath, source, "utf8");
}

function extractConstArrayWithBounds(source, name) {
  const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  const start = match.index;
  const end = match.index + match[0].length;
  const arr = eval(`([${match[1]}])`);
  return { arr, start, end };
}

function escapeJsString(value) {
  return JSON.stringify(String(value || ""));
}

function parseComponentsFromMnemonic(mnemonic) {
  const components = [];
  const seen = new Set();
  const pattern = /([\u3400-\u9fff]+)\s*\(([^)]+)\)/g;
  for (const match of String(mnemonic || "").matchAll(pattern)) {
    const hanzi = String(match[1] || "").trim();
    const meaning = String(match[2] || "").trim();
    const key = `${hanzi}|${meaning}`;
    if (!hanzi || !meaning || seen.has(key)) continue;
    seen.add(key);
    components.push({ hanzi, meaning });
  }
  return components;
}

function validateStory(card, story) {
  if (!story) return "";
  if (hintContainsEnglishAnswer(story, card.english)) return "";
  if (hintContainsPinyin(story, card.pinyin)) return "";
  if (hintContainsPhoneticCue(story)) return "";
  if (isLiteralShapeHint(story)) return "";
  return story;
}

function ensureMnemonicData(card) {
  if (card.mnemonicData && typeof card.mnemonicData === "object") return card;
  const story = validateStory(card, getStoryText(card));
  const components = parseComponentsFromMnemonic(card.mnemonic);
  return {
    ...card,
    mnemonicData: {
      soundAnchor: "",
      story,
      components,
    },
  };
}

function serializeComponents(components) {
  if (!Array.isArray(components) || components.length === 0) return "[]";
  const body = components
    .map((item) => `{hanzi:${escapeJsString(item.hanzi)},meaning:${escapeJsString(item.meaning)}}`)
    .join(",");
  return `[${body}]`;
}

function serializeCard(card) {
  const parts = [];
  if (card.id) parts.push(`id:${escapeJsString(card.id)}`);
  parts.push(`hanzi:${escapeJsString(card.hanzi)}`);
  parts.push(`pinyin:${escapeJsString(card.pinyin)}`);
  parts.push(`english:${escapeJsString(card.english)}`);
  parts.push(`mnemonic:${escapeJsString(card.mnemonic || "")}`);

  const data = card.mnemonicData || { soundAnchor: "", story: "", components: [] };
  const soundAnchor = escapeJsString(data.soundAnchor || "");
  const story = escapeJsString(data.story || "");
  const components = serializeComponents(data.components || []);
  parts.push(`mnemonicData:{soundAnchor:${soundAnchor},story:${story},components:${components}}`);

  return `{${parts.join(",")}}`;
}

function serializeArray(name, cards, comment) {
  const lines = [];
  lines.push(`const ${name} = [`);
  if (comment) lines.push(`  ${comment}`);
  for (const card of cards) {
    lines.push(`  ${serializeCard(card)},`);
  }
  lines.push(`];`);
  return lines.join("\n");
}

function main() {
  const root = path.resolve(__dirname, "..");
  const filePath = path.join(root, "index.html");
  const source = readSource(filePath);

  const vocabExtract = extractConstArrayWithBounds(source, "VOCAB");
  const radicalsExtract = extractConstArrayWithBounds(source, "RADICAL_DECK_CARDS");

  const nextVocab = vocabExtract.arr.map(ensureMnemonicData);
  const nextRadicals = radicalsExtract.arr.map(ensureMnemonicData);

  const vocabBlock = serializeArray("VOCAB", nextVocab, "// === HSK 1 (143 words) ===");
  const radicalsBlock = serializeArray("RADICAL_DECK_CARDS", nextRadicals, null);

  let updated = source;
  updated = updated.slice(0, vocabExtract.start) + vocabBlock + updated.slice(vocabExtract.end);

  const radicalsExtract2 = extractConstArrayWithBounds(updated, "RADICAL_DECK_CARDS");
  updated = updated.slice(0, radicalsExtract2.start) + radicalsBlock + updated.slice(radicalsExtract2.end);

  writeSource(filePath, updated);

  const vocabWithData = nextVocab.filter((card) => card.mnemonicData).length;
  const vocabWithStory = nextVocab.filter((card) => card.mnemonicData && card.mnemonicData.story).length;
  const radicalWithStory = nextRadicals.filter((card) => card.mnemonicData && card.mnemonicData.story).length;

  console.log(`Updated index.html`);
  console.log(`VOCAB cards with mnemonicData: ${vocabWithData}/${nextVocab.length}`);
  console.log(`VOCAB cards with non-empty compliant story: ${vocabWithStory}/${nextVocab.length}`);
  console.log(`RADICAL cards with non-empty compliant story: ${radicalWithStory}/${nextRadicals.length}`);
}

main();
