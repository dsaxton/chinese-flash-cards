#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  anchorIntegratedInStoryWithAliases,
  extractEnglishAnswerTokens,
  getStoryText,
  hasBoilerplateStoryPhrase,
  isLikelyAbstractStory,
  isLikelyComponentOnlyStory,
  isLikelyIncoherentStory,
  isLiteralShapeHint,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  loadDeckData,
  loadPhoneticConfig,
  normalizeAnchorAliasMap,
} = require("./mnemonic-quality-lib");

function parseArgs(argv) {
  const out = {
    out: "work/story-relevance-ranking.json",
    includeEmpty: true,
    minScore: null,
    limit: 30,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") out.out = argv[++i] || out.out;
    else if (arg === "--non-empty") out.includeEmpty = false;
    else if (arg === "--min-score") out.minScore = Number(argv[++i]);
    else if (arg === "--limit") out.limit = Number(argv[++i] || out.limit);
    else if (arg === "--help") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function usage() {
  console.log(
    [
      "Usage:",
      "  node scripts/score-story-relevance.js [--out work/story-relevance-ranking.json] [--non-empty] [--min-score N] [--limit N]",
      "",
      "Ranks stories by heuristic relevance to card meaning.",
    ].join("\n")
  );
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const TOKEN_CUE_MAP = {
  mouth: ["mouth", "lips", "jaw", "shout", "speak"],
  person: ["person", "people", "traveler", "figure", "someone"],
  child: ["child", "kid", "heir", "youngster"],
  woman: ["woman", "lady", "female"],
  hand: ["hand", "palm", "fingers", "grip"],
  heart: ["heart", "pulse", "resolve", "feeling"],
  water: ["water", "stream", "current", "river"],
  fire: ["fire", "spark", "flame"],
  wood: ["wood", "timber", "tree", "trunk"],
  sun: ["sun", "dawn", "daylight"],
  moon: ["moon", "night", "lunar"],
  speech: ["speech", "voice", "declare", "whisper", "words"],
  food: ["food", "meal", "bowl", "eat", "kitchen"],
  door: ["door", "gate", "entrance"],
  rain: ["rain", "clouds", "storm"],
  grain: ["grain", "stalk", "harvest"],
  rice: ["rice", "kernels", "grain"],
  silk: ["silk", "thread", "loom", "strand"],
  money: ["money", "coins", "currency", "trade"],
  vehicle: ["vehicle", "wheels", "axle", "cargo"],
  horse: ["horse", "reins", "mount"],
  walk: ["walk", "route", "travel", "step", "movement"],
  open: ["open", "unlatch", "swing"],
  roof: ["roof", "shelter", "household", "cover"],
  grass: ["grass", "herbs", "shoots", "hillside"],
  plant: ["plant", "herbs", "shoots", "sprout"],
  mound: ["mound", "hillside", "slope", "embankment"],
  place: ["place", "location", "site", "path"],
  called: ["called", "name", "call", "shout"],
  call: ["call", "name", "shout", "reply"],
  think: ["think", "ponder", "consider", "mind"],
  want: ["want", "wish", "desire"],
  eye: ["eye", "gaze", "look", "target"],
  earth: ["earth", "ground", "soil"],
  metal: ["metal", "anvil", "forge", "coins"],
  shell: ["shell", "cowrie", "currency"],
  foot: ["foot", "stride", "track", "runner"],
  eat: ["eat", "food", "meal", "bites"],
  morning: ["morning", "dawn", "sunrise", "before noon"],
  afternoon: ["afternoon", "after noon", "late day"],
  noon: ["noon", "midday"],
  today: ["today", "this day", "present day", "very day"],
  rest: ["rest", "pause", "breathing", "recover"],
  son: ["son", "boy", "child"],
  sir: ["sir", "gentleman", "host"],
  prepare: ["prepare", "packed", "ready", "tickets"],
  minute: ["minute", "sixty", "short cycle", "clock"],
  front: ["front", "ahead", "in front", "before"],
  doctor: ["doctor", "clinic", "healer", "medical"],
  hospital: ["hospital", "medical center", "ambulance", "clinic"],
  sell: ["sell", "market", "swap", "goods"],
  classmate: ["classmate", "learner", "notes", "study"],
  name: ["name", "label", "signed", "written"],
  behind: ["behind", "rear", "back"],
  shop: ["shop", "store", "market", "shelves"],
  like: ["like", "enjoy", "brightens"],
  weather: ["weather", "clouds", "windy", "cold", "sky"],
  delicious: ["delicious", "tasty", "bite", "another bowl"],
  mom: ["mom", "mother", "lunch", "family"],
  wife: ["wife", "household", "family"],
  study: ["study", "notes", "review", "learn"],
  school: ["school", "campus", "bell", "children"],
  introduce: ["introduce", "introducing", "connections", "summoning"],
  quantity: ["quantity", "how many", "how much", "count"],
  what: ["what", "unknown", "asking"],
  thing: ["thing", "item", "stuff", "goods"],
  not: ["not", "no", "never", "refuse", "deny"],
  many: ["many", "count", "amount", "quantity", "fingers"],
  much: ["much", "amount", "quantity", "count"],
  student: ["student", "pupil", "class", "notes", "learner"],
  sorry: ["sorry", "apologize", "forgiveness", "bow"],
  work: ["work", "labor", "shift", "task", "bricks"],
  left: ["left", "opposite", "wrist"],
  side: ["side", "opposite", "wrist", "edge"],
  hope: ["hope", "hoping", "expecting", "gaze", "yearning"],
  begin: ["begin", "start", "whistle", "motion"],
  start: ["start", "begin", "whistle", "motion"],
  find: ["find", "search", "missing key", "pocket"],
  look: ["look", "search", "check", "pocket"],
  early: ["early", "first light", "dawn"],
  time: ["time", "moment", "point"],
  tomorrow: ["tomorrow", "next day", "after one night"],
  week: ["week", "seven days", "cycle"],
  friend: ["friend", "trust", "secrets", "companions"],
  cup: ["cup", "mug", "tea", "table"],
  table: ["table", "surface", "books", "pens"],
  desk: ["desk", "surface", "books", "pens"],
  chair: ["chair", "stool", "sits", "seat"],
  fruit: ["fruit", "produce", "basket", "sweet"],
  apple: ["apple", "fruit", "red fruit", "basket"],
  language: ["language", "tongue", "voices", "words"],
  chinese: ["chinese", "han", "tongue", "voices"],
  swim: ["swim", "glides", "lane", "water", "kicks"],
  pretty: ["pretty", "stunning", "dress", "lights"],
  beautiful: ["beautiful", "stunning", "dress", "lights"],
  movie: ["movie", "screen", "hall", "shadows"],
  television: ["television", "screen", "dramas", "living room"],
  computer: ["computer", "keys", "screen", "hums"],
  tourism: ["tourism", "travel", "suitcases", "roam"],
  travel: ["travel", "roam", "suitcases", "city streets"],
  now: ["now", "moment", "right this moment"],
  sleep: ["sleep", "drifts", "drift", "lights out", "eyes close", "bed", "rest"],
  see: ["see", "appears", "visible", "eyes", "crowd"],
  smile: ["smile", "smiling", "laugh", "grin", "brightens"],
  laugh: ["laugh", "smiling", "smile", "grin", "joy"],
  wear: ["wear", "outfit", "clothes", "dress", "garment", "cloth"],
  clothes: ["clothes", "outfit", "dress", "garment", "cloth", "coat"],
  airplane: ["airplane", "wings", "fly", "clouds", "sky", "metal"],
  happy: ["happy", "glad", "lights up", "good news", "joy", "cheer"],
  glad: ["glad", "happy", "lights up", "good news", "joy"],
  already: ["already", "done", "finished", "complete"],
  enter: ["enter", "step through", "gate", "doorway", "courtyard"],
  ask: ["ask", "question", "voice", "door", "answer", "seek"],
  dance: ["dance", "leap", "rhythm", "swirl", "feet"],
  run: ["run", "jog", "pace", "track", "sprint"],
  wait: ["wait", "remains", "stays", "pause", "silent"],
  correct: ["correct", "right", "nod", "yes", "confirm"],
  good: ["good", "nice", "great", "fine", "well"],
  pass: ["pass", "crosses", "bridge", "behind"],
  know: ["know", "recognize", "introductions", "familiar"],
  speak: ["speak", "words", "voices", "room", "pass", "talk"],
  husband: ["husband", "spouse", "partner", "man"],
  daughter: ["daughter", "girl", "heir", "ribbon"],
  teacher: ["teacher", "instructor", "professor", "class", "board"],
  hospital: ["hospital", "medical center", "ambulance", "clinic"],
  company: ["company", "office", "staff", "business"],
  bus: ["bus", "passengers", "stop", "route"],
  // Remaining HSK1 gaps
  miss: ["miss", "maiden", "young lady", "silk dress"],
  young: ["young", "maiden", "girl", "lady", "silk"],
  lady: ["lady", "maiden", "miss", "silk", "dress"],
  how: ["how", "method", "what way", "manner", "puzzle"],
  walk: ["walk", "heads down", "road", "route", "travel", "step", "movement", "home"],
  above: ["above", "upward", "rises", "kite", "roof", "sky"],
  restaurant: ["restaurant", "inn", "dishes", "travelers", "roadside"],
  hotel: ["hotel", "inn", "travelers", "lodging", "roadside"],
  cat: ["cat", "meow", "feline", "leaps", "wall"],
};

const PHRASE_CUE_MAP = {
  "question particle": ["question", "reply", "tone", "ask"],
  "general measure word": ["measure", "counted", "unit", "count"],
  "possessive particle": ["whose", "ownership", "belongs"],
  "side form": ["side-form", "side"],
  "complement particle": ["manner", "degree", "result", "timing", "quickly", "clearly"],
  "how about": ["opinion", "reaction", "response"],
  "how is": ["opinion", "reaction", "response"],
  "in the process of": ["right now", "moving", "not yet finished", "ongoing"],
};

function escapeRegExp(token) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cueRegex(token) {
  const base = escapeRegExp(token);
  if (!/^[a-z]+$/i.test(token) || token.length < 3) {
    return new RegExp(`\\b${base}\\b`, "i");
  }
  // Handle e-dropping inflections: smile→smiling, hope→hoping, dance→dancing
  if (token.endsWith("e") && token.length >= 4) {
    const stem = escapeRegExp(token.slice(0, -1));
    return new RegExp(`\\b(?:${base}|${stem}(?:e|es|ed|ing|ings))\\b`, "i");
  }
  return new RegExp(`\\b${base}(?:s|es|ed|ing)?\\b`, "i");
}

function collectMeaningCues(english, englishTokens) {
  const out = new Set();
  for (const token of englishTokens) {
    const lower = token.toLowerCase();
    out.add(lower);
    const extras = TOKEN_CUE_MAP[lower] || [];
    extras.forEach((x) => out.add(String(x).toLowerCase()));
  }
  const lowerEnglish = String(english || "").toLowerCase();
  for (const [phrase, cues] of Object.entries(PHRASE_CUE_MAP)) {
    if (!lowerEnglish.includes(phrase)) continue;
    cues.forEach((x) => out.add(String(x).toLowerCase()));
  }
  return [...out];
}

function scoreCard(card, anchorAliasMap) {
  const story = getStoryText(card);
  const soundAnchor = String(card.mnemonicData?.soundAnchor || "").trim();
  const englishTokens = extractEnglishAnswerTokens(card.english || "");
  const meaningCues = collectMeaningCues(card.english, englishTokens);
  const hasAnchor = Boolean(soundAnchor);
  const anchorWord = ((soundAnchor.match(/^Think of ([A-Z]+)\.$/) || [])[1]) || "";
  const anchorIntegrated = hasAnchor
    ? anchorIntegratedInStoryWithAliases(soundAnchor, story, anchorAliasMap)
    : true;

  if (!story) {
    return {
      score: 0,
      reasons: ["empty_story"],
      meaningTokenHits: 0,
      meaningTokenCount: meaningCues.length,
      hasAnchor,
      anchorIntegrated,
    };
  }

  const meaningTokenHits = meaningCues
    .filter((token) => cueRegex(token).test(story))
    .length;

  const reasons = [];
  let score = 100;

  if (hasAnchor && !anchorIntegrated) {
    score -= 35;
    reasons.push("anchor_not_integrated");
  }
  if (meaningCues.length > 0 && hasAnchor && meaningTokenHits === 0) {
    score -= 25;
    reasons.push("anchored_no_meaning_hit");
  }
  if (meaningCues.length > 0 && !hasAnchor && meaningTokenHits === 0) {
    score -= 18;
    reasons.push("unanchored_no_meaning_hit");
  }
  // Anchor-meaning split: anchor and meaning cues are in different semicolon clauses,
  // meaning the sound hook and the meaning hook are disconnected from each other.
  if (anchorIntegrated && hasAnchor && story.includes(";") && meaningTokenHits > 0) {
    const clauses = story.split(";").map((c) => c.trim());
    const anchorClause = clauses.findIndex((c) =>
      new RegExp(`\\b${anchorWord}\\b`, "i").test(c)
    );
    const meaningClause = clauses.findIndex((c) =>
      meaningCues.some((cue) => cueRegex(cue).test(c))
    );
    if (anchorClause !== -1 && meaningClause !== -1 && anchorClause !== meaningClause) {
      score -= 12;
      reasons.push("anchor_meaning_split");
    }
  }
  if (isLikelyIncoherentStory(story)) {
    score -= 30;
    reasons.push("incoherent");
  }
  if (isLikelyAbstractStory(story)) {
    score -= 20;
    reasons.push("abstract");
  }
  if (isLikelyComponentOnlyStory(story, { hasSoundAnchor: hasAnchor, english: card.english })) {
    score -= 20;
    reasons.push("component_only");
  }
  if (hasBoilerplateStoryPhrase(story)) {
    score -= 20;
    reasons.push("boilerplate");
  }
  if (isLiteralShapeHint(story)) {
    score -= 15;
    reasons.push("shape_literal");
  }
  if (hintContainsPhoneticCue(story)) {
    score -= 15;
    reasons.push("phonetic_cue");
  }
  if (hintContainsPinyin(story, card.pinyin)) {
    score -= 10;
    reasons.push("pinyin_leak");
  }
  const words = story.split(/\s+/).filter(Boolean).length;
  if (words > 12) {
    score -= 10;
    reasons.push("too_long");
  }

  return {
    score: Math.max(0, score),
    reasons,
    meaningTokenHits,
    meaningTokenCount: meaningCues.length,
    hasAnchor,
    anchorIntegrated,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }

  const root = path.resolve(__dirname, "..");
  const deck = loadDeckData(root);
  const phoneticConfig = loadPhoneticConfig(root);
  const anchorAliasMap = normalizeAnchorAliasMap(phoneticConfig.phoneticAnchorAliases);
  const cards = [...(deck.vocab || []), ...(deck.radicals || [])];
  let rows = cards.map((card) => {
    const score = scoreCard(card, anchorAliasMap);
    return {
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      english: card.english,
      soundAnchor: String(card.mnemonicData?.soundAnchor || "").trim(),
      story: getStoryText(card),
      ...score,
    };
  });

  if (!args.includeEmpty) rows = rows.filter((row) => row.story);
  if (Number.isFinite(args.minScore)) rows = rows.filter((row) => row.score <= args.minScore);

  rows.sort((a, b) => a.score - b.score || a.hanzi.localeCompare(b.hanzi));

  const outPath = path.resolve(root, args.out);
  ensureParentDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n", "utf8");

  console.log(`Wrote ${rows.length} scored rows to ${outPath}`);
  console.log(`Lowest ${Math.min(args.limit, rows.length)} rows:`);
  rows.slice(0, args.limit).forEach((row) => {
    console.log(
      `${row.score}\t${row.hanzi}\t${row.english}\t[${row.reasons.join(",") || "ok"}]\t${row.story || "(empty)"}`
    );
  });
}

main();
