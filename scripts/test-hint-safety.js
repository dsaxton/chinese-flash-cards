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

function extractConstNumber(source, name) {
  const match = source.match(new RegExp(`const ${name} = (\\d+);`));
  if (!match) throw new Error(`Could not find const ${name}`);
  return Number(match[1]);
}

const ENGLISH_MEANING_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "for", "from", "in", "is", "of", "on",
  "or", "the", "to", "too", "very", "with",
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

function parseMnemonic(card) {
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

function stripPinyinFromHint(text, pinyin) {
  let out = String(text || "");
  const raw = String(pinyin || "").trim();
  if (!raw) return out.trim();
  out = out.replaceAll(raw, " ");
  const plain = normalizePinyinAscii(raw);
  if (plain) {
    const tokens = plain.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      const re = new RegExp(`\\b${token}\\b`, "gi");
      out = out.replace(re, " ");
    }
  }
  return out.replace(/\s+/g, " ").trim();
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

function stripEnglishAnswerFromHint(text, english) {
  let out = String(text || "");
  for (const token of extractEnglishAnswerTokens(english)) {
    const re = new RegExp(`\\b${token}\\b`, "gi");
    out = out.replace(re, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

function stripPhoneticCueText(text) {
  return String(text || "")
    .replace(/\b(?:sounds?|sound)\s+like\b[^.?!]*[.?!]?/gi, " ")
    .replace(/\bthink of\b[^.?!]*[.?!]?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLiteralShapeHint(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return LITERAL_SHAPE_HINT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function buildSafeHint(card, options = {}) {
  let text = parseMnemonic(card);
  if (options.forbidPinyin) text = stripPinyinFromHint(text, card.pinyin);
  if (options.forbidEnglishAnswer) text = stripEnglishAnswerFromHint(text, card.english);
  if (options.forbidPhoneticCue) text = stripPhoneticCueText(text);
  if (options.forbidLiteralShapeHints && isLiteralShapeHint(text)) text = "";
  return text.trim();
}

function containsAnyAnswerToken(text, english) {
  const tokens = extractEnglishAnswerTokens(english);
  return tokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(String(text || "")));
}

function containsPinyinToken(text, pinyin) {
  const plain = normalizePinyinAscii(pinyin);
  if (!plain) return false;
  const tokens = plain.split(/\s+/).filter(Boolean);
  return tokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(String(text || "")));
}

function hasPhoneticCuePhrase(text) {
  return /\b(?:sounds?|sound)\s+like\b/i.test(String(text || "")) || /\bthink of\b/i.test(String(text || ""));
}

function main() {
  const root = path.resolve(__dirname, "..");
  const source = readIndexHtml(root);
  const vocab = extractConstArray(source, "VOCAB");
  const hsk1CardCount = extractConstNumber(source, "HSK1_CARD_COUNT");
  const cards = vocab.slice(0, hsk1CardCount);
  assert(cards.length === hsk1CardCount, "Could not load expected HSK1 card slice");

  for (const card of cards) {
    const e2hHint = buildSafeHint(card, {
      forbidPinyin: true,
      forbidEnglishAnswer: true,
      forbidPhoneticCue: true,
      forbidLiteralShapeHints: true,
    });
    assert(
      !containsAnyAnswerToken(e2hHint, card.english),
      `E2H hint leaks English answer token for ${card.hanzi} (${card.english})`
    );
    assert(
      !containsPinyinToken(e2hHint, card.pinyin),
      `E2H hint leaks pinyin token for ${card.hanzi} (${card.pinyin})`
    );
    assert(
      !hasPhoneticCuePhrase(e2hHint),
      `E2H hint leaks phonetic cue phrase for ${card.hanzi}`
    );

    const h2eHint = buildSafeHint(card, {
      forbidEnglishAnswer: true,
      forbidPhoneticCue: true,
    });
    assert(
      !containsAnyAnswerToken(h2eHint, card.english),
      `H2E hint leaks English answer token for ${card.hanzi} (${card.english})`
    );
    assert(
      !hasPhoneticCuePhrase(h2eHint),
      `H2E hint leaks phonetic cue phrase for ${card.hanzi}`
    );
  }

  console.log(`hint safety test passed (${cards.length} cards)`);
}

main();
