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

function main() {
  const root = path.resolve(__dirname, "..");
  const dataPath = path.join(root, "data", "deck-data.json");
  const deckData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  const nextVocab = (deckData.vocab || []).map(ensureMnemonicData);
  const nextRadicals = (deckData.radicals || []).map(ensureMnemonicData);

  const next = {
    ...deckData,
    vocab: nextVocab,
    radicals: nextRadicals,
  };

  fs.writeFileSync(dataPath, JSON.stringify(next, null, 2) + "\n", "utf8");

  const vocabWithData = nextVocab.filter((card) => card.mnemonicData).length;
  const vocabWithStory = nextVocab.filter((card) => card.mnemonicData && card.mnemonicData.story).length;
  const radicalWithStory = nextRadicals.filter((card) => card.mnemonicData && card.mnemonicData.story).length;

  console.log(`Updated ${dataPath}`);
  console.log(`VOCAB cards with mnemonicData: ${vocabWithData}/${nextVocab.length}`);
  console.log(`VOCAB cards with non-empty compliant story: ${vocabWithStory}/${nextVocab.length}`);
  console.log(`RADICAL cards with non-empty compliant story: ${radicalWithStory}/${nextRadicals.length}`);
}

main();
