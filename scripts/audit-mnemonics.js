#!/usr/bin/env node
const path = require("path");
const {
  collectDeckCards,
  getStoryText,
  hasBoilerplateStoryPhrase,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isLikelyAbstractStory,
  isLikelyComponentOnlyStory,
  isLikelyIncoherentStory,
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
      "  node scripts/audit-mnemonics.js [--mode all|vocab|hsk1|radicals] [--fail-on-violations]",
      "",
      "Checks story text for:",
      "- English answer leakage",
      "- direct pinyin leakage",
      "- explicit phonetic cue phrases",
      "- literal shape wording",
      "- boilerplate phrase fragments",
      "- likely incoherent / abstract / component-only stories",
    ].join("\n")
  );
}

function collectViolations(card, profile, options = {}) {
  const text = getStoryText(card);
  if (!text) return [];
  const violations = [];
  const hasSoundAnchor = Boolean(options.hasSoundAnchor);
  if (profile.forbidEnglishAnswer && !hasSoundAnchor && hintContainsEnglishAnswer(text, card.english)) {
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
  if (profile.forbidBoilerplate && hasBoilerplateStoryPhrase(text)) {
    violations.push("boilerplate_phrase");
  }
  if (profile.forbidIncoherent && isLikelyIncoherentStory(text)) {
    violations.push("likely_incoherent_story");
  }
  if (profile.forbidAbstract && isLikelyAbstractStory(text)) {
    violations.push("likely_abstract_story");
  }
  if (profile.forbidComponentOnly && isLikelyComponentOnlyStory(text, {
    hasSoundAnchor,
    english: card.english,
  })) {
    violations.push("likely_component_only_story");
  }
  if (profile.forbidMultiWordAnchor) {
    const anchor = String(card.mnemonicData?.soundAnchor || "").trim();
    if (anchor && !/^Think of [A-Z]+\.$/.test(anchor)) {
      violations.push("multi_or_noncanonical_sound_anchor");
    }
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
  const { vocab, hsk1Cards, radicals } = collectDeckCards(root);

  const includeVocab = args.mode === "all" || args.mode === "vocab";
  const includeHSK1 = args.mode === "hsk1";
  const includeRadicals = args.mode === "all" || args.mode === "radicals";

  const e2hProfile = {
    forbidEnglishAnswer: true,
    forbidPinyin: true,
    forbidPhoneticCue: true,
    forbidLiteralShapeHints: true,
    forbidBoilerplate: true,
    forbidIncoherent: true,
    forbidAbstract: true,
    forbidComponentOnly: true,
    forbidMultiWordAnchor: true,
  };

  const h2eProfile = {
    forbidEnglishAnswer: true,
    forbidPinyin: false,
    forbidPhoneticCue: true,
    forbidLiteralShapeHints: false,
    forbidBoilerplate: true,
    forbidIncoherent: true,
    forbidAbstract: true,
    forbidComponentOnly: true,
    forbidMultiWordAnchor: true,
  };

  const sections = [];

  if (includeVocab) {
    const e2h = [];
    const h2e = [];
    for (const card of vocab) {
      const text = getStoryText(card);
      const hasSoundAnchor = Boolean(String(card.mnemonicData?.soundAnchor || "").trim());
      const e2hViolations = collectViolations(card, e2hProfile, { hasSoundAnchor });
      const h2eViolations = collectViolations(card, h2eProfile, { hasSoundAnchor });
      if (e2hViolations.length > 0) e2h.push({ ...card, text, violations: e2hViolations });
      if (h2eViolations.length > 0) h2e.push({ ...card, text, violations: h2eViolations });
    }
    sections.push(["All Vocab English to Hanzi Hint Profile", e2h]);
    sections.push(["All Vocab Hanzi to English Hint Profile", h2e]);
    console.log(`Vocab cards with empty story (intentional skip): ${countEmptyStories(vocab)}/${vocab.length}`);
  }

  if (includeHSK1) {
    const e2h = [];
    const h2e = [];
    for (const card of hsk1Cards) {
      const text = getStoryText(card);
      const hasSoundAnchor = Boolean(String(card.mnemonicData?.soundAnchor || "").trim());
      const e2hViolations = collectViolations(card, e2hProfile, { hasSoundAnchor });
      const h2eViolations = collectViolations(card, h2eProfile, { hasSoundAnchor });
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
      forbidBoilerplate: true,
      forbidIncoherent: true,
      forbidAbstract: true,
      forbidComponentOnly: true,
      forbidMultiWordAnchor: true,
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
