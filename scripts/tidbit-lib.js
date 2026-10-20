#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { createTidbitMatcher } = require("../tidbit-match");
const { collectDeckCards } = require("./mnemonic-quality-lib");

function loadModel(rootDir) {
  const { vocab, allCards } = collectDeckCards(rootDir);
  const tidbitData = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "tidbit-data.json"), "utf8"));
  const tidbits = Array.isArray(tidbitData.classicalTidbitsRaw) ? tidbitData.classicalTidbitsRaw : [];
  const maxQuoteChars = Number(tidbitData.tidbitMaxQuoteChars || 24);
  const matcher = createTidbitMatcher({
    tidbits,
    synonyms: tidbitData.tokenSynonyms || {},
    maxQuoteChars,
  });

  return {
    vocab,
    cards: allCards,
    tidbits,
    maxQuoteChars,
    matcher,
  };
}

function getCandidatesForCard(model, card) {
  return model.matcher.getCandidates(card);
}

function pickTidbitForCard(model, card, opts = {}) {
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const salt = Number.isFinite(opts.salt) ? opts.salt : 0;
  return model.matcher.pickTidbit(card, date, salt);
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
