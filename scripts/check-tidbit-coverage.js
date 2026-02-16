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
const RAW_STOPWORDS = new Set([
  "a", "an", "the", "to", "of", "and", "or", "is", "are", "be", "in", "on", "at", "for", "with",
  "from", "it", "its", "this", "that", "these", "those",
]);
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

function extractRawMeaningTokens(text) {
  const normalized = normalizeEnglishText(text);
  const tokens = new Set();
  for (const raw of normalized.split(" ")) {
    const tok = raw.trim();
    if (!tok || tok.length < 2) continue;
    if (RAW_STOPWORDS.has(tok)) continue;
    tokens.add(tok);
  }
  return tokens;
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
const cardRawMeaningTokens = new Map(
  VOCAB.map((card) => [card.hanzi, extractRawMeaningTokens(card.english)])
);

const tidbitMeta = TIDBITS.map((tidbit) => ({
  tidbit,
  tokens: extractMeaningTokens((tidbit.relevance || []).join(" ")),
  rawTokens: extractRawMeaningTokens((tidbit.relevance || []).join(" ")),
  quoteLen: String(tidbit.quote || "").replace(/\\s+/g, "").length,
}));

const GENERIC_CANONICAL_TOKENS = new Set([
  "exist", "continuation", "quantity",
]);

function getCandidates(card) {
  const cardTokens = cardMeaningTokens.get(card.hanzi) || new Set();
  const cardRawTokens = cardRawMeaningTokens.get(card.hanzi) || new Set();
  if (cardTokens.size === 0 && cardRawTokens.size === 0) return { rawMatches: 0, candidates: [] };

  const scored = [];

  for (let i = 0; i < tidbitMeta.length; i++) {
    const meta = tidbitMeta[i];
    if (meta.quoteLen > MAX_QUOTE_CHARS) continue;
    const canonicalScore = overlapCount(cardTokens, meta.tokens);
    const rawScore = overlapCount(cardRawTokens, meta.rawTokens);
    const canonicalSpecificScore = [...cardTokens].reduce(
      (n, token) => n + (!GENERIC_CANONICAL_TOKENS.has(token) && meta.tokens.has(token) ? 1 : 0),
      0
    );
    if (rawScore === 0 && canonicalSpecificScore === 0) continue;
    const score = rawScore * 3 + canonicalSpecificScore * 2 + canonicalScore;
    scored.push({ score, meta, idx: i });
  }

  if (scored.length === 0) return { rawMatches: 0, candidates: [] };

  scored.sort((a, b) => b.score - a.score || a.meta.quoteLen - b.meta.quoteLen || a.idx - b.idx);
  const topScore = scored[0].score;
  const candidates = scored.filter((item) => item.score >= topScore - 1).slice(0, 6);
  return { rawMatches: scored.length, candidates };
}

let covered = 0;
let matchedWords = 0;
let worstRawMatches = 0;
let worstWord = "";
const primaryTidbitCount = new Map();
for (const card of VOCAB) {
  const { rawMatches, candidates } = getCandidates(card);
  if (rawMatches > worstRawMatches) {
    worstRawMatches = rawMatches;
    worstWord = card.hanzi;
  }
  if (candidates.length > 0) {
    covered++;
    matchedWords++;
    const primary = candidates[0].meta.tidbit.quote;
    primaryTidbitCount.set(primary, (primaryTidbitCount.get(primary) || 0) + 1);
  }
}

const total = VOCAB.length;
const ratio = covered / total;
const percent = (ratio * 100).toFixed(1);
const minRatio = Number(process.argv[2] || "0.80");
const maxRawMatchesPerWord = Number(process.argv[3] || "90");
const maxPrimaryShare = Number(process.argv[4] || "0.20");
const primaryMax = Math.max(0, ...primaryTidbitCount.values());
const primaryShare = matchedWords ? primaryMax / matchedWords : 0;

console.log(`tidbit coverage: ${covered}/${total} (${percent}%)`);
console.log(`minimum threshold: ${(minRatio * 100).toFixed(1)}%`);
console.log(`max raw matches for a word: ${worstRawMatches} (${worstWord || "n/a"})`);
console.log(`max allowed raw matches per word: ${maxRawMatchesPerWord}`);
console.log(`largest primary-tidbit share: ${(primaryShare * 100).toFixed(1)}%`);
console.log(`max allowed primary-tidbit share: ${(maxPrimaryShare * 100).toFixed(1)}%`);

if (ratio < minRatio || worstRawMatches > maxRawMatchesPerWord || primaryShare > maxPrimaryShare) {
  console.error("coverage below threshold");
  process.exit(1);
}
