#!/usr/bin/env node
const path = require("path");
const {
  collectDeckCards,
  collectHsk1UniqueChars,
  loadPhoneticConfig,
} = require("./mnemonic-quality-lib");
const {
  buildAnchorSuggestion,
  ensureParentDir,
  parseCedictByChar,
  parseMakeMeAHanziDictionary,
  parseUnihanKPhonetic,
  safeRead,
  scoreCandidate,
  toSyllables,
} = require("./phonetic-hint-lib");
const fs = require("fs");

function parseArgs(argv) {
  const out = {
    makeMeAHanzi: "",
    unihan: "",
    cedict: "",
    out: "data/mnemonic-seeds/hsk1-phonetic-hints.json",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--makemeahanzi") out.makeMeAHanzi = argv[++i] || "";
    else if (arg === "--unihan") out.unihan = argv[++i] || "";
    else if (arg === "--cedict") out.cedict = argv[++i] || "";
    else if (arg === "--out") out.out = argv[++i] || out.out;
    else if (arg === "--help") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return out;
}

function usage() {
  console.log(
    [
      "Usage:",
      "  node scripts/build-phonetic-hints.js --makemeahanzi /path/to/dictionary.txt --unihan /path/to/Unihan_Readings.txt --cedict /path/to/cedict_ts.u8 [--out data/mnemonic-seeds/hsk1-phonetic-hints.json]",
      "",
      "Generates reviewable per-character phonetic hint suggestions for all HSK1 characters.",
    ].join("\n")
  );
}

function collectDeckPinyinByChar(hsk1Cards) {
  const byChar = new Map();

  for (const card of hsk1Cards) {
    const chars = [...String(card.hanzi || "")];
    const syllables = toSyllables(card.pinyin);
    if (chars.length !== syllables.length) continue;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const syl = syllables[i];
      if (!ch || !syl) continue;
      const existing = byChar.get(ch) || new Set();
      existing.add(syl);
      byChar.set(ch, existing);
    }
  }

  const normalized = new Map();
  for (const [key, set] of byChar.entries()) normalized.set(key, [...set]);
  return normalized;
}

function pickPinyinCandidates(ch, deckByChar, cedictByChar) {
  const deck = deckByChar.get(ch) || [];
  const cedict = cedictByChar.get(ch) || [];

  if (deck.length > 0) {
    return {
      syllables: deck,
      sources: ["deck"],
    };
  }

  if (cedict.length > 0) {
    return {
      syllables: cedict,
      sources: ["cedict"],
    };
  }

  return {
    syllables: [],
    sources: [],
  };
}

function buildCandidates({ syllables, sources, mmh, unihanFamily, anchorMap, englishWordSet }) {
  const rows = [];

  for (const syllable of syllables) {
    const anchorWord = String(anchorMap[syllable] || "").toUpperCase();
    const score = scoreCandidate({
      anchorWord,
      syllable,
      pinyinSources: sources,
      mmh,
      unihanFamily,
      englishWordSet,
    });

    rows.push({
      syllable,
      anchorWord: englishWordSet.has(anchorWord) ? anchorWord : "",
      suggestion: englishWordSet.has(anchorWord) ? buildAnchorSuggestion(anchorWord) : "",
      score,
      reasons: {
        pinyinSources: sources,
        hasMmhPhonetic: Boolean(String(mmh.phonetic || "").trim()),
        unihanFamilySize: unihanFamily.length,
      },
    });
  }

  rows.sort((a, b) => b.score - a.score || a.syllable.localeCompare(b.syllable));
  return rows;
}

function generatePhoneticHints(args) {
  const root = path.resolve(__dirname, "..");
  const { hsk1Cards } = collectDeckCards(root);
  const hsk1Chars = collectHsk1UniqueChars(hsk1Cards);

  const phoneticConfig = loadPhoneticConfig(root);
  const anchorMap = phoneticConfig.phoneticAnchorCandidates || {};
  const englishWords = Array.isArray(phoneticConfig.englishSoundAnchorWords)
    ? phoneticConfig.englishSoundAnchorWords
    : [];
  const englishWordSet = new Set(englishWords.map((w) => String(w).toUpperCase()));

  const mmhByChar = parseMakeMeAHanziDictionary(safeRead(args.makeMeAHanzi));
  const unihanByChar = parseUnihanKPhonetic(safeRead(args.unihan));
  const cedictByChar = parseCedictByChar(safeRead(args.cedict));
  const deckByChar = collectDeckPinyinByChar(hsk1Cards);

  const entries = hsk1Chars.map((hanzi) => {
    const mmh = mmhByChar.get(hanzi) || {
      decomposition: "",
      type: "",
      hint: "",
      phonetic: "",
      semantic: "",
    };
    const unihanFamily = unihanByChar.get(hanzi) || [];
    const { syllables, sources } = pickPinyinCandidates(hanzi, deckByChar, cedictByChar);
    const candidates = buildCandidates({
      syllables,
      sources,
      mmh,
      unihanFamily,
      anchorMap,
      englishWordSet,
    });

    return {
      hanzi,
      pinyin: syllables,
      pinyinSources: sources,
      phoneticProfile: {
        makeMeAHanzi: {
          phonetic: mmh.phonetic || "",
          semantic: mmh.semantic || "",
          type: mmh.type || "",
        },
        unihanFamily,
      },
      bestCandidate: candidates[0] || null,
      candidates,
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    hsk1CardCount: hsk1Cards.length,
    hsk1UniqueCharCount: hsk1Chars.length,
    sourceNotes: {
      makeMeAHanzi: path.resolve(args.makeMeAHanzi),
      unihan: args.unihan ? path.resolve(args.unihan) : null,
      cedict: args.cedict ? path.resolve(args.cedict) : null,
    },
    entries,
  };

  const outPath = path.resolve(root, args.out);
  ensureParentDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");

  return {
    outPath,
    total: entries.length,
    withCandidate: entries.filter((entry) => entry.bestCandidate && entry.bestCandidate.suggestion).length,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.makeMeAHanzi) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const stats = generatePhoneticHints(args);
  console.log(`Wrote ${stats.total} character entries to ${stats.outPath}`);
  console.log(`Characters with at least one anchor suggestion: ${stats.withCandidate}/${stats.total}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  generatePhoneticHints,
  parseArgs,
};
