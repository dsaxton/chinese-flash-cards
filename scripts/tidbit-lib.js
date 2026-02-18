#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const RAW_STOPWORDS = new Set([
  "a", "an", "the", "to", "of", "and", "or", "is", "are", "be", "in", "on", "at", "for", "with",
  "from", "it", "its", "this", "that", "these", "those",
]);
const NOISY_MEANING_TOKENS = new Set([
  "side", "form", "particle", "measure", "general", "possessive",
]);

const GENERIC_CANONICAL_TOKENS = new Set([
  "exist", "continuation", "quantity",
]);

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

function extractConstObject(source, name) {
  const re = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`);
  const match = source.match(re);
  if (!match) throw new Error(`Could not find const ${name}`);
  return eval(`({${match[1]}})`);
}

function extractConstNumber(source, name, fallback) {
  const match = source.match(new RegExp(`const ${name} = (\\d+);`));
  if (!match) return fallback;
  return Number(match[1]);
}

function loadModel(rootDir) {
  const source = readIndexHtml(rootDir);
  const vocab = extractConstArray(source, "VOCAB");
  const radicals = extractConstArray(source, "RADICAL_DECK_CARDS");
  const tidbits = extractConstArray(source, "CLASSICAL_TIDBITS_RAW");
  const synonyms = extractConstObject(source, "TOKEN_SYNONYMS");
  const assignMatch = source.match(/Object\.assign\(TOKEN_SYNONYMS, \{([\s\S]*?)\n\}\);/);
  if (assignMatch) Object.assign(synonyms, eval(`({${assignMatch[1]}})`));
  const maxQuoteChars = extractConstNumber(source, "TIDBIT_MAX_QUOTE_CHARS", 24);

  function normalizeEnglishText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function canonicalToken(token) {
    let t = token;
    if (synonyms[t]) t = synonyms[t];
    if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
    else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
    else if (t.endsWith("s") && t.length > 4) t = t.slice(0, -1);
    if (synonyms[t]) t = synonyms[t];
    return t;
  }

  function extractRawMeaningTokens(text) {
    const normalized = normalizeEnglishText(text);
    const tokens = new Set();
    for (const raw of normalized.split(" ")) {
      const tok = raw.trim();
      if (!tok || tok.length < 2) continue;
      if (RAW_STOPWORDS.has(tok)) continue;
      if (NOISY_MEANING_TOKENS.has(tok)) continue;
      tokens.add(tok);
    }
    return tokens;
  }

  function extractMeaningTokens(text) {
    const normalized = normalizeEnglishText(text);
    const tokens = new Set();
    for (const raw of normalized.split(" ")) {
      if (NOISY_MEANING_TOKENS.has(raw.trim())) continue;
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

  const cards = [...vocab, ...radicals];
  const cardMeaningTokens = new Map(
    cards.map((card) => [card.hanzi, extractMeaningTokens(card.english)])
  );
  const cardRawMeaningTokens = new Map(
    cards.map((card) => [card.hanzi, extractRawMeaningTokens(card.english)])
  );
  const tidbitMeta = tidbits.map((tidbit, index) => ({
    tidbit,
    index,
    tokens: extractMeaningTokens((tidbit.relevance || []).join(" ")),
    rawTokens: extractRawMeaningTokens((tidbit.relevance || []).join(" ")),
    quoteLen: String(tidbit.quote || "").replace(/\s+/g, "").length,
  }));

  return {
    source,
    vocab,
    radicals,
    cards,
    tidbits,
    maxQuoteChars,
    cardMeaningTokens,
    cardRawMeaningTokens,
    tidbitMeta,
    overlapCount,
  };
}

function getCandidatesForCard(model, card) {
  const cardTokens = model.cardMeaningTokens.get(card.hanzi) || new Set();
  const cardRawTokens = model.cardRawMeaningTokens.get(card.hanzi) || new Set();
  if (cardTokens.size === 0 && cardRawTokens.size === 0) {
    return { rawMatches: 0, candidates: [], scored: [] };
  }

  const scored = [];
  for (const meta of model.tidbitMeta) {
    if (meta.quoteLen > model.maxQuoteChars) continue;
    const canonicalScore = model.overlapCount(cardTokens, meta.tokens);
    const rawScore = model.overlapCount(cardRawTokens, meta.rawTokens);
    const canonicalSpecificScore = [...cardTokens].reduce(
      (n, token) => n + (!GENERIC_CANONICAL_TOKENS.has(token) && meta.tokens.has(token) ? 1 : 0),
      0
    );
    if (rawScore === 0 && canonicalSpecificScore === 0) continue;
    const score = rawScore * 3 + canonicalSpecificScore * 2 + canonicalScore;
    scored.push({ score, rawScore, canonicalScore, canonicalSpecificScore, meta });
  }

  if (scored.length === 0) return { rawMatches: 0, candidates: [], scored: [] };

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.meta.quoteLen - b.meta.quoteLen ||
      a.meta.index - b.meta.index
  );
  const topScore = scored[0].score;
  const candidates = scored.filter((item) => item.score >= topScore - 1).slice(0, 6);
  return { rawMatches: scored.length, candidates, scored };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickTidbitForCard(model, card, opts = {}) {
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const salt = Number.isFinite(opts.salt) ? opts.salt : 0;
  const seed = hashString(`${card.hanzi}|${date}|${salt}`);
  const { candidates } = getCandidatesForCard(model, card);
  if (candidates.length === 0) return null;
  return candidates[seed % candidates.length].meta.tidbit;
}

function computeCoverageStats(model) {
  let covered = 0;
  let matchedWords = 0;
  let worstRawMatches = 0;
  let worstWord = "";
  const primaryTidbitCount = new Map();

  for (const card of model.vocab) {
    const { rawMatches, candidates } = getCandidatesForCard(model, card);
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

  const total = model.vocab.length;
  const ratio = total === 0 ? 0 : covered / total;
  const primaryMax = Math.max(0, ...primaryTidbitCount.values());
  const primaryShare = matchedWords === 0 ? 0 : primaryMax / matchedWords;

  return {
    covered,
    total,
    ratio,
    worstRawMatches,
    worstWord,
    primaryShare,
    matchedWords,
  };
}

function listUnmatchedWords(model) {
  return model.vocab.filter((card) => getCandidatesForCard(model, card).candidates.length === 0);
}

module.exports = {
  loadModel,
  getCandidatesForCard,
  pickTidbitForCard,
  computeCoverageStats,
  listUnmatchedWords,
};
