#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ENGLISH_MEANING_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "for", "from", "in", "is", "of", "on",
  "or", "the", "to", "with",
]);

const LITERAL_SHAPE_HINT_PATTERNS = [
  /\blooks like\b/i,
  /\bshape\b/i,
  /\bstroke(s)?\b/i,
  /\bline(s)?\b/i,
  /\bbox(es)?\b/i,
  /\brectangle\b/i,
  /\bcross\b/i,
  /\bhook\b/i,
  /\bvertical\b/i,
  /\bhorizontal\b/i,
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadDeckData(rootDir) {
  return readJson(path.join(rootDir, "data", "deck-data.json"));
}

function loadPhoneticConfig(rootDir) {
  return readJson(path.join(rootDir, "data", "phonetic-config.json"));
}

function normalizePinyinAscii(pinyin) {
  return String(pinyin || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ü/g, "u")
    .replace(/[^a-z'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMnemonicText(card) {
  const mnemonic = card.mnemonic || "";
  const componentPattern = /([\u3400-\u9fff]+)\s*\(([^)]+)\)/g;
  let text = mnemonic.trim();
  const firstStop = text.search(/[。.!?]/);
  if (firstStop !== -1) {
    const head = text.slice(0, firstStop + 1);
    if (/[\u3400-\u9fff]+\s*\([^)]+\)/.test(head)) {
      text = text.slice(firstStop + 1).trim();
    }
  }

  if (!text) {
    text = mnemonic
      .replace(componentPattern, "$1")
      .replace(/\s*[+＋=＝]\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  text = text
    .replace(/[\u3400-\u9fff]+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*[+＋=＝]\s*/g, " ")
    .replace(/\s*[-–—]\s*/g, " — ")
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentenceParts = text.match(/[^.!?]+[.!?]?/g) || [];
  if (sentenceParts.length > 2) {
    text = sentenceParts.slice(0, 2).join(" ").trim();
  }

  return text;
}

function getStoryText(card) {
  if (card && card.mnemonicData && typeof card.mnemonicData === "object") {
    return String(card.mnemonicData.story || "").trim();
  }
  return parseMnemonicText(card);
}

function extractEnglishAnswerTokens(english) {
  const words = String(english || "")
    .toLowerCase()
    .match(/[a-z]+/g) || [];
  const out = [];
  for (const word of words) {
    if (word.length < 3) continue;
    if (ENGLISH_MEANING_STOPWORDS.has(word)) continue;
    out.push(word);
  }
  return out;
}

function hintContainsPinyin(text, pinyin) {
  const rawText = String(text || "");
  const raw = String(pinyin || "").trim();
  if (!raw) return false;
  const escapedRaw = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?<![\\p{L}])${escapedRaw}(?![\\p{L}])`, "iu").test(rawText)) {
    return true;
  }
  const plain = normalizePinyinAscii(raw);
  const tokens = plain.split(/\s+/).filter(Boolean);
  return tokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(rawText));
}

function hintContainsEnglishAnswer(text, english) {
  const rawText = String(text || "");
  return extractEnglishAnswerTokens(english)
    .some((token) => new RegExp(`\\b${token}`, "i").test(rawText));
}

function hintContainsPhoneticCue(text) {
  return /\b(?:sounds?|sound)\s+like\b/i.test(String(text || "")) || /\bthink of\b/i.test(String(text || ""));
}

function isLiteralShapeHint(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return LITERAL_SHAPE_HINT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function collectDeckCards(rootDir = process.cwd()) {
  const deck = loadDeckData(rootDir);
  const vocab = Array.isArray(deck.vocab) ? deck.vocab : [];
  const radicals = Array.isArray(deck.radicals) ? deck.radicals : [];
  const hsk1Count = Number(deck.hsk1CardCount) || 0;
  return {
    vocab,
    hsk1Cards: vocab.slice(0, hsk1Count),
    radicals,
  };
}

function collectHsk1UniqueChars(hsk1Cards) {
  const chars = new Set();
  for (const card of hsk1Cards) {
    for (const ch of String(card.hanzi || "")) chars.add(ch);
  }
  return [...chars];
}

module.exports = {
  collectDeckCards,
  collectHsk1UniqueChars,
  extractEnglishAnswerTokens,
  getStoryText,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isLiteralShapeHint,
  loadDeckData,
  loadPhoneticConfig,
};
