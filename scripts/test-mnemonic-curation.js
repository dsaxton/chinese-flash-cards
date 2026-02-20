#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const {
  anchorFormsForStory,
  anchorIntegratedInStoryWithAliases,
  collectDeckCards,
  extractCanonicalAnchorWord,
  extractCanonicalAnchorWords,
  getStoryText,
  hasBoilerplateStoryPhrase,
  hintContainsEnglishAnswer,
  hintContainsPhoneticCue,
  hintContainsPinyin,
  isAnchorGrammaticallyIsolated,
  isLikelyAbstractStory,
  isLikelyComponentOnlyStory,
  isLikelyIncoherentStory,
  isLiteralShapeHint,
  isMetaTemplateStory,
  jaccardSimilarity,
  loadPhoneticConfig,
  normalizeAnchorAliasMap,
  storyContentWords,
  storyTextExcludingAnchor,
} = require("./mnemonic-quality-lib");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertCanonicalSoundAnchor(anchor, cardLabel) {
  const text = String(anchor || "").trim();
  if (!text) return;
  assert(/^Think of [A-Z]+(, [A-Z]+)*\.$/.test(text), `${cardLabel}: soundAnchor must be canonical ALL-CAPS phrase (e.g. "Think of JET." or "Think of JET, DAY.")`);
  assert(!/\b(?:sounds?|sound)\s+like\b/i.test(text), `${cardLabel}: soundAnchor cannot use "sounds like"`);
}

function readAllowedAnchorWords() {
  const root = path.resolve(__dirname, "..");
  const configPath = path.join(root, "data", "phonetic-config.json");
  const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const values = Array.isArray(data.englishSoundAnchorWords) ? data.englishSoundAnchorWords : [];
  return new Set(values.map((value) => String(value).toUpperCase()));
}

function testMnemonicDataCoverage(cards, minNonEmpty) {
  for (const card of cards) {
    const label = `${card.hanzi} (${card.english})`;
    const hasSoundAnchor = Boolean(String(card.mnemonicData && card.mnemonicData.soundAnchor || "").trim());
    assert(
      card.mnemonicData && typeof card.mnemonicData === "object",
      `${label}: missing mnemonicData object`
    );
    assert(
      Array.isArray(card.mnemonicData.components),
      `${label}: mnemonicData.components must be an array`
    );
    assertCanonicalSoundAnchor(card.mnemonicData.soundAnchor, label);

    const story = getStoryText(card);
    if (!story) continue;
    if (!hasSoundAnchor) {
      assert(!hintContainsEnglishAnswer(story, card.english), `${label}: story leaks English answer token`);
    }
    const storyForPinyin = storyTextExcludingAnchor(story, card.mnemonicData.soundAnchor);
    assert(!hintContainsPinyin(storyForPinyin, card.pinyin), `${label}: story leaks pinyin token`);
    assert(!hintContainsPhoneticCue(story), `${label}: story uses forbidden phonetic cue phrasing`);
    assert(!isLiteralShapeHint(story), `${label}: story uses forbidden literal shape phrasing`);
    assert(!hasBoilerplateStoryPhrase(story), `${label}: story uses forbidden boilerplate phrasing`);
    assert(!isLikelyIncoherentStory(story), `${label}: story appears incoherent`);
    assert(!isLikelyAbstractStory(story), `${label}: story appears abstract/non-scene`);
    assert(
      !isLikelyComponentOnlyStory(story, { hasSoundAnchor, english: card.english }),
      `${label}: story appears to rely only on component/radical explanation`
    );
    assert(!isMetaTemplateStory(story), `${label}: story uses forbidden meta-template language (narrates the mnemonic system instead of painting a scene)`);
  }

  const nonEmptyCount = cards.filter((card) => getStoryText(card).length > 0).length;
  assert(
    nonEmptyCount >= minNonEmpty,
    `Expected at least ${minNonEmpty} cards with non-empty compliant stories, got ${nonEmptyCount}`
  );
}

function testStorySafety(cards, { requireNonEmpty = false } = {}) {
  for (const card of cards) {
    const label = `${card.hanzi} (${card.english})`;
    const hasSoundAnchor = Boolean(String(card.mnemonicData && card.mnemonicData.soundAnchor || "").trim());
    const story = getStoryText(card);
    if (!story) {
      if (requireNonEmpty) {
        throw new Error(`${label}: story must be non-empty`);
      }
      continue;
    }
    if (!hasSoundAnchor) {
      assert(!hintContainsEnglishAnswer(story, card.english), `${label}: story leaks English answer token`);
    }
    const storyForPinyin = storyTextExcludingAnchor(story, card.mnemonicData?.soundAnchor);
    assert(!hintContainsPinyin(storyForPinyin, card.pinyin), `${label}: story leaks pinyin token`);
    assert(!hintContainsPhoneticCue(story), `${label}: story uses forbidden phonetic cue phrasing`);
    assert(!isLiteralShapeHint(story), `${label}: story uses forbidden literal shape phrasing`);
    assert(!hasBoilerplateStoryPhrase(story), `${label}: story uses forbidden boilerplate phrasing`);
    assert(!isLikelyIncoherentStory(story), `${label}: story appears incoherent`);
    assert(!isLikelyAbstractStory(story), `${label}: story appears abstract/non-scene`);
    assert(
      !isLikelyComponentOnlyStory(story, { hasSoundAnchor, english: card.english }),
      `${label}: story appears to rely only on component/radical explanation`
    );
    assert(!isMetaTemplateStory(story), `${label}: story uses forbidden meta-template language (narrates the mnemonic system instead of painting a scene)`);
  }
}

function testSoundAnchorBatch(cards, allowedWords, anchorAliasMap, minAnchors) {
  let anchorCount = 0;
  let integratedAnchorCount = 0;
  for (const card of cards) {
    const label = `${card.hanzi} (${card.english})`;
    const anchor = String(card.mnemonicData && card.mnemonicData.soundAnchor || "").trim();
    const story = getStoryText(card);
    if (!anchor) continue;

    anchorCount++;
    assertCanonicalSoundAnchor(anchor, label);

    const anchorWords = extractCanonicalAnchorWords(anchor);
    assert(anchorWords.length > 0, `${label}: unable to parse canonical anchor word(s)`);
    for (const w of anchorWords) {
      assert(
        allowedWords.has(w),
        `${label}: anchor word "${w}" is outside allowed English anchor set`
      );
    }

    if (anchorIntegratedInStoryWithAliases(anchor, story, anchorAliasMap)) {
      integratedAnchorCount++;
    }
  }

  assert(
    anchorCount >= minAnchors,
    `Expected at least ${minAnchors} HSK1 cards with sound anchors, got ${anchorCount}`
  );
  assert(
    integratedAnchorCount >= 75,
    `Expected at least 75 HSK1 sound anchors integrated into stories, got ${integratedAnchorCount}`
  );
}

function testSingleCharAnchorCoverage(cards, minRatio) {
  const eligible = cards.filter((card) => [...String(card.hanzi || "")].length === 1);
  const anchored = eligible.filter((card) => String(card.mnemonicData && card.mnemonicData.soundAnchor || "").trim());
  const ratio = eligible.length > 0 ? anchored.length / eligible.length : 1;
  const pct = Math.round(ratio * 1000) / 10;
  const minPct = Math.round(minRatio * 1000) / 10;
  assert(
    ratio >= minRatio,
    `Expected at least ${minPct}% single-character HSK1 cards with sound anchors, got ${pct}% (${anchored.length}/${eligible.length})`
  );
}

function testNonHsk1Coverage(vocab, hsk1Count, minStoryRatio, minAnchorRatio) {
  const nonHsk1 = vocab.slice(hsk1Count);
  const withStory = nonHsk1.filter((card) => getStoryText(card).length > 0).length;
  const withAnchor = nonHsk1.filter((card) => String(card.mnemonicData?.soundAnchor || "").trim()).length;
  const storyRatio = nonHsk1.length > 0 ? withStory / nonHsk1.length : 1;
  const anchorRatio = nonHsk1.length > 0 ? withAnchor / nonHsk1.length : 1;
  const storyPct = Math.round(storyRatio * 1000) / 10;
  const anchorPct = Math.round(anchorRatio * 1000) / 10;
  const minStoryPct = Math.round(minStoryRatio * 1000) / 10;
  const minAnchorPct = Math.round(minAnchorRatio * 1000) / 10;

  assert(
    storyRatio >= minStoryRatio,
    `Expected at least ${minStoryPct}% non-HSK1 vocab story coverage, got ${storyPct}% (${withStory}/${nonHsk1.length})`
  );
  assert(
    anchorRatio >= minAnchorRatio,
    `Expected at least ${minAnchorPct}% non-HSK1 vocab anchor coverage, got ${anchorPct}% (${withAnchor}/${nonHsk1.length})`
  );
}

function testRadicalsFullyCurated(radicals, anchorAliasMap) {
  for (const card of radicals) {
    const label = `${card.hanzi} (${card.english})`;
    assert(
      card.mnemonicData && typeof card.mnemonicData === "object",
      `${label}: radicals deck entries must use mnemonicData`
    );
    const anchor = String(card.mnemonicData.soundAnchor || "").trim();
    assert(anchor.length > 0, `${label}: radical cards must include soundAnchor`);
    assertCanonicalSoundAnchor(anchor, label);
    const story = getStoryText(card);
    assert(story.length > 0, `${label}: story must be non-empty`);
    assert(!hintContainsEnglishAnswer(story, card.english), `${label}: story leaks English answer token`);
    const storyForPinyin = storyTextExcludingAnchor(story, anchor);
    assert(!hintContainsPinyin(storyForPinyin, card.pinyin), `${label}: story leaks pinyin token`);
    assert(!hintContainsPhoneticCue(story), `${label}: story uses forbidden phonetic cue phrasing`);
    assert(!isLiteralShapeHint(story), `${label}: story uses forbidden literal shape phrasing`);
    assert(!hasBoilerplateStoryPhrase(story), `${label}: story uses forbidden boilerplate phrasing`);
    assert(!isLikelyIncoherentStory(story), `${label}: story appears incoherent`);
    assert(!isLikelyAbstractStory(story), `${label}: story appears abstract/non-scene`);
    assert(
      !isLikelyComponentOnlyStory(story, { hasSoundAnchor: true, english: card.english }),
      `${label}: story appears to rely only on component/radical explanation`
    );
    assert(!isMetaTemplateStory(story), `${label}: story uses forbidden meta-template language (narrates the mnemonic system instead of painting a scene)`);
    assert(
      !isAnchorGrammaticallyIsolated(anchor, story),
      `${label}: anchor is grammatically isolated (jammed before a noun with no connector)`
    );
    const anchorForms = anchorFormsForStory(anchor, anchorAliasMap);
    assert(anchorForms.length > 0, `${label}: unable to derive anchor forms`);
    assert(
      anchorIntegratedInStoryWithAliases(anchor, story, anchorAliasMap),
      `${label}: anchor must be integrated in story text`
    );
  }
}

function testSharedAnchorDistinctness(cards, maxSimilarity) {
  const byAnchor = new Map();
  for (const card of cards) {
    const aw = extractCanonicalAnchorWord(card.mnemonicData?.soundAnchor || "");
    if (!aw) continue;
    if (!byAnchor.has(aw)) byAnchor.set(aw, []);
    byAnchor.get(aw).push(card);
  }
  for (const [anchor, group] of byAnchor) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.hanzi === b.hanzi) continue;
        const wordsA = storyContentWords(getStoryText(a), anchor);
        const wordsB = storyContentWords(getStoryText(b), anchor);
        const sim = jaccardSimilarity(wordsA, wordsB);
        assert(
          sim <= maxSimilarity,
          `${a.hanzi} (${a.english}) and ${b.hanzi} (${b.english}) share anchor ${anchor} ` +
          `and have too-similar stories (Jaccard ${(sim * 100).toFixed(0)}% > ${(maxSimilarity * 100).toFixed(0)}%)`
        );
      }
    }
  }
}

function testAnchorNarrativeRegressions(cards) {
  const byHanzi = new Map(cards.map((card) => [card.hanzi, card]));
  const checks = [
    { hanzi: "喂", mustContain: ["hello", "phone"], mustNotContain: ["crackles first"] },
    { hanzi: "会", mustContain: ["can"] },
    { hanzi: "回", mustContain: ["return"] },
    { hanzi: "块", mustContain: ["money"] },
  ];

  for (const check of checks) {
    const card = byHanzi.get(check.hanzi);
    assert(card, `Missing regression card ${check.hanzi}`);
    const story = getStoryText(card).toLowerCase();
    for (const token of check.mustContain || []) {
      assert(story.includes(token), `${check.hanzi}: expected story to include "${token}"`);
    }
    for (const token of check.mustNotContain || []) {
      assert(!story.includes(token), `${check.hanzi}: story should not include "${token}"`);
    }
  }
}

function testAliasIntegrationRegressions(cards, anchorAliasMap) {
  const byHanzi = new Map(cards.map((card) => [card.hanzi, card]));
  const checks = [];

  for (const check of checks) {
    const card = byHanzi.get(check.hanzi);
    assert(card, `Missing alias regression card ${check.hanzi}`);
    const story = getStoryText(card);
    const anchorWord = extractCanonicalAnchorWord(card.mnemonicData?.soundAnchor || "");
    assert(anchorWord, `${check.hanzi}: missing canonical anchor`);
    if (check.anchorMustBeAbsent) {
      assert(
        !new RegExp(`\\b${anchorWord}\\b`, "i").test(story),
        `${check.hanzi}: story should avoid forced anchor token ${anchorWord}`
      );
    }
    assert(
      new RegExp(`\\b${check.expectedAlias}\\b`, "i").test(story),
      `${check.hanzi}: expected alias token "${check.expectedAlias}" in story`
    );
    assert(
      anchorIntegratedInStoryWithAliases(card.mnemonicData?.soundAnchor || "", story, anchorAliasMap),
      `${check.hanzi}: alias should satisfy anchor integration`
    );
  }
}

function testNoPlaceholderTemplateLanguage(cards) {
  const bannedPatterns = [
    /\bforms near the old gate\b/i,
    /\blantern smoke curls above stones beside a quiet gate\b/i,
    /\bmeets [a-z].* near the old gate\b/i,
  ];

  for (const card of cards) {
    const story = getStoryText(card);
    if (!story) continue;
    for (const pattern of bannedPatterns) {
      assert(
        !pattern.test(story),
        `${card.hanzi} (${card.english}): story uses banned placeholder template language`
      );
    }
  }
}

function testStoryWordCount(cards, maxWords) {
  for (const card of cards) {
    const story = getStoryText(card);
    if (!story) continue;
    const words = story.split(/\s+/).filter(Boolean).length;
    assert(
      words <= maxWords,
      `${card.hanzi} (${card.english}): story too long (${words} > ${maxWords})`
    );
  }
}

function escapeRegex(token) {
  return String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function englishMeaningTokens(english) {
  return String(english || "")
    .toLowerCase()
    .match(/[a-z]+/g) || [];
}

function normalizeStoryTemplate(card, story, anchorAliasMap) {
  let normalized = String(story || "").toLowerCase();
  const anchorForms = anchorFormsForStory(card.mnemonicData?.soundAnchor || "", anchorAliasMap);
  for (const form of anchorForms) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegex(String(form).toLowerCase())}\\b`, "gi"), " {anchor} ");
  }
  for (const token of englishMeaningTokens(card.english)) {
    if (token.length < 3) continue;
    normalized = normalized.replace(new RegExp(`\\b${escapeRegex(token)}\\b`, "gi"), " {meaning} ");
  }
  return normalized
    .replace(/[^a-z{}\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function testStoryTemplateDiversity(cards, anchorAliasMap, maxTemplateReuse) {
  const storyCards = cards.filter((card) => getStoryText(card));
  const buckets = new Map();
  for (const card of storyCards) {
    const story = getStoryText(card);
    const template = normalizeStoryTemplate(card, story, anchorAliasMap);
    if (!template) continue;
    if (!buckets.has(template)) buckets.set(template, []);
    buckets.get(template).push(card);
  }

  const repeated = [...buckets.entries()]
    .filter(([, list]) => list.length > maxTemplateReuse)
    .sort((a, b) => b[1].length - a[1].length);

  if (repeated.length > 0) {
    const details = repeated.slice(0, 5).map(([template, list]) => {
      const sample = list.slice(0, 5).map((card) => `${card.hanzi} (${card.english})`).join(", ");
      return `template=${JSON.stringify(template)} count=${list.length} sample=[${sample}]`;
    });
    throw new Error(
      `Story template diversity regression: found ${repeated.length} templates reused more than ${maxTemplateReuse} times.\n` +
      details.join("\n")
    );
  }
}

function testAnchorPlacementDiversity(cards, anchorAliasMap, maxStartRatio) {
  let anchoredStories = 0;
  let anchorAtStart = 0;

  for (const card of cards) {
    const story = getStoryText(card);
    if (!story) continue;
    const anchorForms = anchorFormsForStory(card.mnemonicData?.soundAnchor || "", anchorAliasMap);
    if (!anchorForms.length) continue;
    if (!anchorIntegratedInStoryWithAliases(card.mnemonicData?.soundAnchor || "", story, anchorAliasMap)) continue;

    anchoredStories++;
    const firstToken = story.split(/\s+/)[0]?.replace(/[^A-Za-z-]/g, "") || "";
    if (
      anchorForms.some((form) => new RegExp(`^${escapeRegex(String(form))}$`, "i").test(firstToken))
    ) {
      anchorAtStart++;
    }
  }

  const ratio = anchoredStories > 0 ? anchorAtStart / anchoredStories : 0;
  const ratioPct = Math.round(ratio * 1000) / 10;
  const maxPct = Math.round(maxStartRatio * 1000) / 10;
  assert(
    ratio <= maxStartRatio,
    `Anchor placement diversity regression: ${ratioPct}% of anchored stories start with anchor token (max ${maxPct}%).`
  );
}

function main() {
  const root = path.resolve(__dirname, "..");
  const { vocab, hsk1Cards, radicals } = collectDeckCards(root);
  const phoneticConfig = loadPhoneticConfig(root);
  const anchorAliasMap = normalizeAnchorAliasMap(phoneticConfig.phoneticAnchorAliases);
  const allowedAnchorWords = readAllowedAnchorWords();

  testStorySafety(vocab);
  testMnemonicDataCoverage(hsk1Cards, 25);
  testSoundAnchorBatch(hsk1Cards, allowedAnchorWords, anchorAliasMap, 80);
  testSingleCharAnchorCoverage(hsk1Cards, 0.95);
  testNonHsk1Coverage(vocab, hsk1Cards.length, 0.95, 0.8);
  testMnemonicDataCoverage(radicals, radicals.length);
  testRadicalsFullyCurated(radicals, anchorAliasMap);
  testAnchorNarrativeRegressions(hsk1Cards);
  testAliasIntegrationRegressions([...hsk1Cards, ...radicals], anchorAliasMap);
  testNoPlaceholderTemplateLanguage(vocab);
  testNoPlaceholderTemplateLanguage(radicals);
  testStoryTemplateDiversity([...vocab, ...radicals], anchorAliasMap, 8);
  testAnchorPlacementDiversity([...vocab, ...radicals], anchorAliasMap, 0.6);
  testAnchorPlacementDiversity(radicals, anchorAliasMap, 0.5);
  testSharedAnchorDistinctness([...vocab, ...radicals], 0.3);
  testStoryWordCount(vocab, 12);
  testStoryWordCount(radicals, 12);

  console.log("mnemonic curation test passed");
}

main();
