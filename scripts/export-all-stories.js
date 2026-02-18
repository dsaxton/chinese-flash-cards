#!/usr/bin/env node
// scripts/export-all-stories.js
//
// Exports HSK1 vocab + radicals stories for coherence review.
//
// Usage:
//   node scripts/export-all-stories.js > work/coherence-review-input.json

const path = require("path");
const { collectDeckCards, getStoryText } = require("./mnemonic-quality-lib");

function toRow(card, deck) {
  const md = card.mnemonicData || {};
  return {
    deck,
    hanzi: card.hanzi,
    pinyin: card.pinyin,
    english: card.english,
    soundAnchor: String(md.soundAnchor || "").trim() || null,
    story: getStoryText(card),
    components: Array.isArray(md.components) ? md.components : [],
  };
}

function main() {
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards, radicals } = collectDeckCards(root);
  const rows = [
    ...hsk1Cards.map((card) => toRow(card, "hsk1")),
    ...radicals.map((card) => toRow(card, "radicals")),
  ];
  console.log(JSON.stringify(rows, null, 2));
}

main();

