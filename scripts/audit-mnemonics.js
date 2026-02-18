#!/usr/bin/env node
const path = require("path");
const {
  collectDeckCards,
  getStoryText,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isLiteralShapeHint,
} = require("./mnemonic-quality-lib");

function parseArgs(argv) {
  const out = {
    failOnViolations: false,
    mode: "all",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fail-on-violations") out.failOnViolations = true;
    else if (arg === "--mode") out.mode = argv[++i] || "all";
    else if (arg === "--help") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function usage() {
  console.log(
    [
      "Usage:",
      "  node scripts/audit-mnemonics.js [--mode all|hsk1|radicals] [--fail-on-violations]",
      "",
      "Checks story text for:",
      "- English answer leakage",
      "- direct pinyin leakage",
      "- explicit phonetic cue phrases",
      "- literal shape wording",
    ].join("\n")
  );
}

function collectViolations(card, profile) {
  const text = getStoryText(card);
  if (!text) return [];
  const violations = [];
  if (profile.forbidEnglishAnswer && hintContainsEnglishAnswer(text, card.english)) {
    violations.push("english_answer_leak");
  }
  if (profile.forbidPinyin && hintContainsPinyin(text, card.pinyin)) {
    violations.push("pinyin_leak");
  }
  if (profile.forbidPhoneticCue && hintContainsPhoneticCue(text)) {
    violations.push("explicit_phonetic_cue");
  }
  if (profile.forbidLiteralShapeHints && isLiteralShapeHint(text)) {
    violations.push("literal_shape_description");
  }
  return violations;
}

function printSection(label, rows) {
  console.log(`\n## ${label}`);
  if (rows.length === 0) {
    console.log("No violations.");
    return;
  }
  for (const row of rows) {
    console.log(
      `- ${row.hanzi} (${row.pinyin}) [${row.english}] -> ${row.violations.join(", ")} :: ${row.text}`
    );
  }
}

function countEmptyStories(cards) {
  let count = 0;
  for (const card of cards) {
    if (!getStoryText(card)) count++;
  }
  return count;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const root = path.resolve(__dirname, "..");
  const { hsk1Cards, radicals } = collectDeckCards(root);

  const includeHSK1 = args.mode === "all" || args.mode === "hsk1";
  const includeRadicals = args.mode === "all" || args.mode === "radicals";

  const e2hProfile = {
    forbidEnglishAnswer: true,
    forbidPinyin: true,
    forbidPhoneticCue: true,
    forbidLiteralShapeHints: true,
  };

  const h2eProfile = {
    forbidEnglishAnswer: true,
    forbidPinyin: false,
    forbidPhoneticCue: true,
    forbidLiteralShapeHints: false,
  };

  const sections = [];

  if (includeHSK1) {
    const e2h = [];
    const h2e = [];
    for (const card of hsk1Cards) {
      const text = getStoryText(card);
      const e2hViolations = collectViolations(card, e2hProfile);
      const h2eViolations = collectViolations(card, h2eProfile);
      if (e2hViolations.length > 0) e2h.push({ ...card, text, violations: e2hViolations });
      if (h2eViolations.length > 0) h2e.push({ ...card, text, violations: h2eViolations });
    }
    sections.push(["HSK1 English to Hanzi Hint Profile", e2h]);
    sections.push(["HSK1 Hanzi to English Hint Profile", h2e]);
    console.log(`HSK1 cards with empty story (intentional skip): ${countEmptyStories(hsk1Cards)}/${hsk1Cards.length}`);
  }

  if (includeRadicals) {
    const rows = [];
    const profile = {
      forbidEnglishAnswer: true,
      forbidPinyin: false,
      forbidPhoneticCue: true,
      forbidLiteralShapeHints: false,
    };
    for (const card of radicals) {
      const text = getStoryText(card);
      const violations = collectViolations(card, profile);
      if (violations.length > 0) rows.push({ ...card, text, violations });
    }
    sections.push(["Radicals Hint Profile", rows]);
    console.log(`Radical cards with empty story (intentional skip): ${countEmptyStories(radicals)}/${radicals.length}`);
  }

  for (const [label, rows] of sections) {
    printSection(label, rows);
  }

  const totalViolations = sections.reduce((n, [, rows]) => n + rows.length, 0);
  console.log(`\nTotal cards with violations: ${totalViolations}`);

  if (args.failOnViolations && totalViolations > 0) {
    process.exit(1);
  }
}

main();
