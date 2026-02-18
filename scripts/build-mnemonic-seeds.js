#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  collectDeckCards,
  collectHsk1UniqueChars,
} = require("./mnemonic-quality-lib");

function parseArgs(argv) {
  const out = {
    makeMeAHanzi: "",
    arthurCsv: "",
    koohiiCsv: "",
    out: "data/mnemonic-seeds/hsk1-seeds.json",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--makemeahanzi") out.makeMeAHanzi = argv[++i] || "";
    else if (arg === "--arthur") out.arthurCsv = argv[++i] || "";
    else if (arg === "--koohii") out.koohiiCsv = argv[++i] || "";
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
      "  node scripts/build-mnemonic-seeds.js --makemeahanzi /path/to/dictionary.txt [--arthur /path/to/stories.csv] [--koohii /path/to/koohii.csv] [--out data/mnemonic-seeds/hsk1-seeds.json]",
      "",
      "Notes:",
      "- --makemeahanzi should point to Make Me a Hanzi dictionary.txt (JSON lines).",
      "- --arthur and --koohii are optional cross-reference CSV files.",
    ].join("\n")
  );
}

function safeRead(filePath) {
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8");
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
    const ch = row.character;
    if (!ch) continue;
    const etymology = row.etymology || {};
    const hint = String(etymology.hint || "").trim();
    if (!hint) continue;
    byChar.set(ch, {
      decomposition: String(row.decomposition || "").trim(),
      hint,
      type: String(etymology.type || "").trim(),
    });
  }
  return byChar;
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

function mapStoriesByChar(rows) {
  const out = new Map();
  for (const row of rows) {
    const char =
      row.character || row.kanji || row.hanzi || row.zi || row.symbol || row.keyword_character || "";
    if (!char || [...char].length !== 1) continue;
    const story = row.story || row.mnemonic || row.koohii || row.heisig_story || row.text || "";
    const keyword = row.keyword || row.meaning || "";
    if (!story && !keyword) continue;
    const existing = out.get(char) || [];
    existing.push({
      keyword: String(keyword || "").trim(),
      story: String(story || "").trim(),
    });
    out.set(char, existing);
  }
  return out;
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.makeMeAHanzi) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const root = path.resolve(__dirname, "..");
  const { hsk1Cards } = collectDeckCards(root);
  const hsk1Chars = collectHsk1UniqueChars(hsk1Cards);

  const makeMeAData = parseMakeMeAHanziDictionary(safeRead(args.makeMeAHanzi));
  const arthurByChar = mapStoriesByChar(parseSimpleCsv(safeRead(args.arthurCsv)));
  const koohiiByChar = mapStoriesByChar(parseSimpleCsv(safeRead(args.koohiiCsv)));

  const entries = [];
  for (const ch of hsk1Chars) {
    const mmh = makeMeAData.get(ch) || null;
    const arthurStories = arthurByChar.get(ch) || [];
    const koohiiStories = koohiiByChar.get(ch) || [];
    entries.push({
      hanzi: ch,
      makeMeAHanzi: mmh,
      arthurStories,
      koohiiStories,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceNotes: {
      makeMeAHanzi: path.resolve(args.makeMeAHanzi),
      arthur: args.arthurCsv ? path.resolve(args.arthurCsv) : null,
      koohii: args.koohiiCsv ? path.resolve(args.koohiiCsv) : null,
    },
    hsk1CardCount: hsk1Cards.length,
    hsk1UniqueCharCount: hsk1Chars.length,
    entries,
  };

  const outPath = path.resolve(root, args.out);
  ensureParentDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");

  const mmhCount = entries.filter((e) => e.makeMeAHanzi && e.makeMeAHanzi.hint).length;
  console.log(`Wrote ${entries.length} entries to ${outPath}`);
  console.log(`Make Me a Hanzi coverage: ${mmhCount}/${entries.length}`);
}

main();
