#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const source = fs.readFileSync(htmlPath, "utf8");

function extractConstArray(name) {
  const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  return eval(`([${match[1]}])`);
}

function extractConstObject(name) {
  const re = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  return eval(`({${match[1]}})`);
}

function extractConstNumber(name, fallback) {
  const match = source.match(new RegExp(`const ${name} = (\\\\d+);`));
  if (!match) return fallback;
  return Number(match[1]);
}

const VOCAB = extractConstArray("VOCAB");
const TIDBITS = extractConstArray("CLASSICAL_TIDBITS_RAW");
const TOKEN_SYNONYMS = extractConstObject("TOKEN_SYNONYMS");
const MAX_QUOTE_CHARS = extractConstNumber("TIDBIT_MAX_QUOTE_CHARS", 24);

function normalizeEnglishText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function canonicalToken(token) {
  let t = token;
  if (TOKEN_SYNONYMS[t]) t = TOKEN_SYNONYMS[t];
  if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith("s") && t.length > 4) t = t.slice(0, -1);
  if (TOKEN_SYNONYMS[t]) t = TOKEN_SYNONYMS[t];
  return t;
}

function extractMeaningTokens(text) {
  const normalized = normalizeEnglishText(text);
  const tokens = new Set();
  for (const raw of normalized.split(" ")) {
    const tok = canonicalToken(raw.trim());
    if (!tok || tok.length < 2) continue;
    tokens.add(tok);
  }
  return tokens;
}

function overlapCount(a, b) {
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count++;
  }
  return count;
}

const cardMeaningTokens = new Map(
  VOCAB.map((card) => [card.hanzi, extractMeaningTokens(card.english)])
);

const tidbitMeta = TIDBITS.map((tidbit) => ({
  tokens: extractMeaningTokens((tidbit.relevance || []).join(" ")),
  quoteLen: String(tidbit.quote || "").replace(/\\s+/g, "").length,
}));

function hasTidbit(card) {
  const cardTokens = cardMeaningTokens.get(card.hanzi) || new Set();
  if (cardTokens.size === 0) return false;

  for (let i = 0; i < tidbitMeta.length; i++) {
    const meta = tidbitMeta[i];
    if (meta.quoteLen > MAX_QUOTE_CHARS) continue;
    const score = overlapCount(cardTokens, meta.tokens);
    if (score > 0) return true;
  }
  return false;
}

let covered = 0;
for (const card of VOCAB) {
  if (hasTidbit(card)) covered++;
}

const total = VOCAB.length;
const ratio = covered / total;
const percent = (ratio * 100).toFixed(1);
const minRatio = Number(process.argv[2] || "0.50");

console.log(`tidbit coverage: ${covered}/${total} (${percent}%)`);
console.log(`minimum threshold: ${(minRatio * 100).toFixed(1)}%`);

if (ratio < minRatio) {
  console.error("coverage below threshold");
  process.exit(1);
}
