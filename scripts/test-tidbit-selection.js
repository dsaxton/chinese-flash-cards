#!/usr/bin/env node
const path = require("path");
const {
  loadModel,
  pickTidbitForCard,
  getCandidatesForCard,
} = require("./tidbit-lib");

const root = path.resolve(__dirname, "..");
const model = loadModel(root);
const opts = { date: "2026-02-16", salt: 424242 };

function findCard(hanzi) {
  const card = model.vocab.find((item) => item.hanzi === hanzi);
  if (!card) throw new Error(`Missing card: ${hanzi}`);
  return card;
}

function findAnyCard(hanzi) {
  const card = (model.cards || []).find((item) => item.hanzi === hanzi);
  if (!card) throw new Error(`Missing card: ${hanzi}`);
  return card;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Regression checks for previously problematic words.
const expectedQuotes = {
  "手机": new Set(["言必信，行必果。", "知者不言，言者不知。", "道可道，非常道。"]),
  "外": new Set(["夷狄之有君，不如诸夏之亡也。", "运筹帷幄之中，决胜千里之外。"]),
  "四": new Set(["四海之内，皆兄弟也。", "朝三而暮四。"]),
  "医院": new Set(["父母唯其疾之忧。"]),
  "的": new Set(["大道之行也，天下为公。"]),
  "些": new Set(["积土成山，风雨兴焉。"]),
  "得": new Set(["得道多助，失道寡助。"]),
};

for (const [hanzi, allowed] of Object.entries(expectedQuotes)) {
  const card = findCard(hanzi);
  const picked = pickTidbitForCard(model, card, opts);
  assert(picked, `Expected a tidbit for ${hanzi}`);
  assert(allowed.has(picked.quote), `Unexpected tidbit for ${hanzi}: ${picked.quote}`);
}

// Radicals should be eligible when meaning overlap is strong, without forcing weak overlaps.
const woodRadical = findAnyCard("木");
const woodTidbit = pickTidbitForCard(model, woodRadical, opts);
assert(woodTidbit, "Expected a tidbit for radical 木");
assert(
  new Set(["桃李不言，下自成蹊。"]).has(woodTidbit.quote),
  `Unexpected tidbit for radical 木: ${woodTidbit.quote}`
);

const waterRadical = findAnyCard("水");
const waterTidbit = pickTidbitForCard(model, waterRadical, opts);
assert(waterTidbit, "Expected a tidbit for radical 水");
assert(
  new Set(["上善若水。", "兵无常势，水无常形。"]).has(waterTidbit.quote),
  `Unexpected tidbit for radical 水: ${waterTidbit.quote}`
);

const earthRadical = findAnyCard("土");
const earthTidbit = pickTidbitForCard(model, earthRadical, opts);
assert(earthTidbit, "Expected a tidbit for radical 土");
assert(
  new Set(["道大，天大，地大，王亦大。"]).has(earthTidbit.quote),
  `Unexpected tidbit for radical 土: ${earthTidbit.quote}`
);

const metalRadical = findAnyCard("金");
const metalTidbit = pickTidbitForCard(model, metalRadical, opts);
assert(metalTidbit, "Expected a tidbit for radical 金");
assert(
  new Set(["锲而不舍，金石可镂。"]).has(metalTidbit.quote),
  `Unexpected tidbit for radical 金: ${metalTidbit.quote}`
);

const rainRadical = findAnyCard("雨");
const rainTidbit = pickTidbitForCard(model, rainRadical, opts);
assert(rainTidbit, "Expected a tidbit for radical 雨");
assert(
  new Set(["上善若水。", "兵无常势，水无常形。"]).has(rainTidbit.quote),
  `Unexpected tidbit for radical 雨: ${rainTidbit.quote}`
);

const weakRadical = findAnyCard("阝");
const weakTidbit = pickTidbitForCard(model, weakRadical, opts);
assert(!weakTidbit, `Expected no forced tidbit for radical 阝, got ${weakTidbit && weakTidbit.quote}`);

const weakSpeechSideForm = findAnyCard("讠");
const weakSpeechSideFormTidbit = pickTidbitForCard(model, weakSpeechSideForm, opts);
assert(
  !weakSpeechSideFormTidbit,
  `Expected no forced tidbit for radical 讠, got ${weakSpeechSideFormTidbit && weakSpeechSideFormTidbit.quote}`
);

// Candidate pool should stay bounded to reduce repetition.
for (const card of model.cards || model.vocab) {
  const { candidates } = getCandidatesForCard(model, card);
  assert(candidates.length <= 6, `Candidate pool exceeds 6 for ${card.hanzi}`);
}

console.log("tidbit selection test passed");
