// Cultural tidbit matching: scores classical quotes against a card's English meaning.
// Shared by index.html (browser global `TidbitMatch`) and scripts/tidbit-lib.js (require).
(function (root) {
  const RAW_STOPWORDS = new Set([
    "a", "an", "the", "to", "of", "and", "or", "is", "are", "be", "in", "on", "at", "for", "with",
    "from", "it", "its", "this", "that", "these", "those",
  ]);
  const NOISY_MEANING_TOKENS = new Set([
    "side", "form", "particle", "measure", "general",
  ]);
  const GENERIC_CANONICAL_TOKENS = new Set([
    "exist", "continuation", "quantity",
  ]);

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function normalizeEnglishText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function overlapCount(a, b) {
    let count = 0;
    for (const token of a) {
      if (b.has(token)) count++;
    }
    return count;
  }

  // tidbits: tidbit-data.json classicalTidbitsRaw; synonyms: tokenSynonyms.
  function createTidbitMatcher({ tidbits, synonyms, maxQuoteChars }) {
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
      const tokens = new Set();
      for (const tok of normalizeEnglishText(text).split(" ")) {
        if (tok.length < 2 || RAW_STOPWORDS.has(tok) || NOISY_MEANING_TOKENS.has(tok)) continue;
        tokens.add(tok);
      }
      return tokens;
    }

    function extractMeaningTokens(text) {
      const tokens = new Set();
      for (const raw of normalizeEnglishText(text).split(" ")) {
        if (NOISY_MEANING_TOKENS.has(raw)) continue;
        const tok = canonicalToken(raw);
        if (tok.length < 2) continue;
        tokens.add(tok);
      }
      return tokens;
    }

    const tidbitMeta = tidbits.map((tidbit, index) => ({
      tidbit,
      index,
      tokens: extractMeaningTokens((tidbit.relevance || []).join(" ")),
      rawTokens: extractRawMeaningTokens((tidbit.relevance || []).join(" ")),
      quoteLen: String(tidbit.quote || "").replace(/\s+/g, "").length,
    }));

    // Returns every scoring tidbit plus the small pool of top candidates a pick draws from.
    function getCandidates(card) {
      const cardTokens = extractMeaningTokens(card.english);
      const cardRawTokens = extractRawMeaningTokens(card.english);
      if (cardTokens.size === 0 && cardRawTokens.size === 0) {
        return { rawMatches: 0, candidates: [], scored: [] };
      }

      const scored = [];
      for (const meta of tidbitMeta) {
        if (meta.quoteLen > maxQuoteChars) continue;
        const canonicalScore = overlapCount(cardTokens, meta.tokens);
        const rawScore = overlapCount(cardRawTokens, meta.rawTokens);
        const canonicalSpecificScore = [...cardTokens].reduce(
          (n, token) => n + (!GENERIC_CANONICAL_TOKENS.has(token) && meta.tokens.has(token) ? 1 : 0),
          0
        );
        // Require direct lexical overlap, or at least one non-generic conceptual overlap.
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
      // Keep a small pool of strong candidates to reduce repetition.
      const candidates = scored.filter((item) => item.score >= topScore - 1).slice(0, 6);
      return { rawMatches: scored.length, candidates, scored };
    }

    // Deterministic per card, date, and salt, so a card shows the same tidbit all day.
    function pickTidbit(card, date, salt) {
      const { candidates } = getCandidates(card);
      if (candidates.length === 0) return null;
      const seed = hashString(`${card.hanzi}|${date}|${salt}`);
      return candidates[seed % candidates.length].meta.tidbit;
    }

    return { getCandidates, pickTidbit };
  }

  const api = { createTidbitMatcher, hashString };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TidbitMatch = api;
})(this);
