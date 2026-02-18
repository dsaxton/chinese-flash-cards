#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function normalizePinyinAscii(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSyllables(text) {
  return normalizePinyinAscii(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[1-5]$/, ""))
    .filter(Boolean);
}

function safeRead(filePath) {
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8");
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }

  out.push(cur);
  return out;
}

function parseSimpleCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length === 0) continue;

    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cols[j] || "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseMakeMeAHanziDictionary(text) {
  const byChar = new Map();

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    const ch = String(row.character || "").trim();
    if (!ch || [...ch].length !== 1) continue;

    const etymology = row.etymology || {};
    const entry = {
      decomposition: String(row.decomposition || "").trim(),
      type: String(etymology.type || "").trim(),
      hint: String(etymology.hint || "").trim(),
      phonetic: String(etymology.phonetic || "").trim(),
      semantic: String(etymology.semantic || "").trim(),
    };

    byChar.set(ch, entry);
  }

  return byChar;
}

function parseUnihanKPhonetic(text) {
  const byChar = new Map();
  const linePattern = /^U\+([0-9A-F]{4,6})\s+kPhonetic\s+(.+)$/;

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(linePattern);
    if (!match) continue;

    const codePoint = parseInt(match[1], 16);
    const hanzi = String.fromCodePoint(codePoint);
    const rawValue = match[2].trim();

    const family = (rawValue.match(/[\u3400-\u9FFF]/g) || []).filter(Boolean);
    if (family.length === 0) continue;

    const existing = byChar.get(hanzi) || new Set();
    for (const ch of family) existing.add(ch);
    byChar.set(hanzi, existing);
  }

  const normalized = new Map();
  for (const [key, set] of byChar.entries()) {
    normalized.set(key, [...set]);
  }
  return normalized;
}

function parseCedictByChar(text) {
  const byChar = new Map();
  const linePattern = /^\S+\s+(\S+)\s+\[([^\]]+)\]\s+\//;

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(linePattern);
    if (!match) continue;

    const simplified = String(match[1] || "").trim();
    const pinyin = String(match[2] || "").trim();
    if (!simplified || !pinyin) continue;

    const chars = [...simplified];
    const syllables = toSyllables(pinyin);
    if (chars.length !== syllables.length) continue;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const syl = syllables[i];
      if (!syl) continue;

      const existing = byChar.get(ch) || new Set();
      existing.add(syl);
      byChar.set(ch, existing);
    }
  }

  const normalized = new Map();
  for (const [key, set] of byChar.entries()) {
    normalized.set(key, [...set]);
  }
  return normalized;
}

function extractConstObject(source, name) {
  const match = source.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`));
  if (!match) return {};
  return eval(`({${match[1]}})`);
}

function extractConstSetValues(source, name) {
  const match = source.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!match) return [];
  return eval(`[${match[1]}]`);
}

function scoreCandidate({
  anchorWord,
  syllable,
  pinyinSources,
  mmh,
  unihanFamily,
  englishWordSet,
}) {
  const hasAnchor = Boolean(anchorWord) && englishWordSet.has(anchorWord.toUpperCase());
  const pinyinSignal = pinyinSources.length > 0 ? (pinyinSources.includes("deck") ? 1 : 0.8) : 0;

  let familySignal = 0;
  const mmhPhonetic = String(mmh.phonetic || "").trim();
  if (mmhPhonetic && unihanFamily.length > 0) {
    familySignal = unihanFamily.includes(mmhPhonetic) ? 1 : 0.7;
  } else if (mmhPhonetic || unihanFamily.length > 0) {
    familySignal = 0.6;
  }

  const syllableSignal = syllable ? 0.9 : 0;
  const lexicalSignal = hasAnchor ? 1 : 0;

  const score =
    0.35 * familySignal +
    0.35 * pinyinSignal +
    0.2 * lexicalSignal +
    0.1 * syllableSignal;

  return Number(score.toFixed(3));
}

function buildAnchorSuggestion(anchorWord) {
  if (!anchorWord) return "";
  return `Think of ${anchorWord.toUpperCase()}.`;
}

module.exports = {
  buildAnchorSuggestion,
  ensureParentDir,
  extractConstObject,
  extractConstSetValues,
  normalizePinyinAscii,
  parseCedictByChar,
  parseMakeMeAHanziDictionary,
  parseSimpleCsv,
  parseUnihanKPhonetic,
  safeRead,
  scoreCandidate,
  toSyllables,
};
