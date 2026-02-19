# Plan

## Mnemonic Curation

> Design principles, quality rules, and tooling: **`docs/mnemonic-curation.md`**

Run after any data edit:

```bash
node scripts/audit-mnemonics.js --mode all --fail-on-violations
node scripts/validate-anchor-stories.js
node scripts/test-mnemonic-curation.js
node scripts/test-hint-safety.js
```

### Completed
- Meta-template ban: added `isMetaTemplateStory()` detector to quality lib, `-40` penalty in scorer, hard assertion in test suite.
- Rewrote all 272 meta-template stories as concrete, pictureable scenes.
- Clarified dual-proximity doctrine: dual proximity is a property of the *story*, not the anchor word.
- Anchor grammar gate: added `isAnchorGrammaticallyIsolated()` detector to catch anchors jammed before nouns with no connector, `-30` penalty in scorer, hard assertion for radical cards.
- Shared-anchor distinctness gate: cards sharing the same anchor word must have low story word-overlap.
- Per-deck anchor placement cap: radical stories held to ≤ 50% anchor-first (global cap remains 60%).
- Rewrote 26 radical stories — anchors now fill real grammatical slots, placement diversity at 14%.
- All 311 stories now pass the full curation test suite.
- Sound anchor audit: fixed 11 anchor-syllable mismatches where anchors poorly approximated the Chinese sound (e.g. DAY→DONG for 懂 dǒng, MAMA→MEN for 门 mén, CHAIN→SWORE for 错 cuò). Rewrote 2 additional stories for broken grammar (让) and missing meaning link (非常).
- Pinyin-leak exclusion: audit and test scripts now exclude the anchor word itself from pinyin-leak detection — anchors that match the romanization are by design, not leaks.
- Conservative anchor diversification: replaced 5 more family-anchor mismatches with precise per-syllable matches (KEY→CHEE for 七 qī, HAN→HEN for 很 hěn, YOU→YIN for 阴 yīn, JAR→GIN for 近/进 jìn). Added YIN to allowed list.
- Grammar particle review: rewrote 着 story to demonstrate ongoing action through scene rather than naming the function.
- Vocab anchor grammar gate audit: 125 vocab stories flagged, but nearly all are false positives (SHE/YOU/HOW as natural pronoun/adverb subjects). Gate stays radical-only until the heuristic is improved.
- 次 cì (CHAIN): confirmed no clean English word for the Mandarin "ts" initial; CHAIN kept as best available affricate.

### Next Steps (Mnemonic)
1. Expand `phoneticAnchorAliases` for anchors where exact token usage harms sentence quality.
2. Add a small fixed snapshot set for narrative quality in CI to catch accidental template drift.
3. Pilot stricter anchor-placement cap (reduce max anchor-at-start from 60% to 40% if quality holds).
4. Diversify remaining "family anchors" — SHE/ZOO/YOU/SHEER still cover 15–20 syllables each; further per-syllable splits need new anchor words or alias support.
5. Improve anchor grammar gate heuristic to reduce false positives on natural pronoun/adverb subjects before enabling for vocab.

---

## Priority 2: Cultural Tidbit Quality Expansion

### Goal
Improve quote quality/coverage now that tidbits are available across all decks.

### Work
1. Expand tidbit corpus for more radical concepts with concrete semantic overlap.
2. Curate/adjust relevance tags for better radical matches while preserving precision.
3. Add spot-check fixtures for additional radicals beyond `木` and `水`.

### Acceptance
1. More radical cards surface high-quality tidbits where overlap is meaningful.
2. Weak/abstract radicals still return `null` (no forced matches).

---

## Priority 3: Test/Quality Gates

### Goal
Strengthen guardrails for future data updates.

### Work
1. Add stronger mnemonic fixture snapshots for larger HSK1 subsets.
2. Add CI gate for `scripts/audit-mnemonics.js --fail-on-violations`.

### Acceptance
1. CI fails on mnemonic audit regressions.
2. Fixture tests catch narrative-quality regressions early.

---

## Future

1. Study guidance for combining decks effectively.
2. Tone imagery pilot (measure recall benefit vs added cognitive load).
3. Post-lesson "Expand/Continue" option so learners can keep going after the daily queue:
   offer to start the next lesson immediately (same deck), with an optional small cap
   on extra new cards; include a simple replay of finished cards without timers.

### Visual Shape Hints for Hanzi

Stories currently carry two hooks: **sound** (phonetic anchor) and **meaning**
(scene). A third hook — **visual shape** of the character — could strengthen
recall, especially for simple pictographic characters.

**Approaches, ranked by feasibility:**

| Approach | Difficulty | Coverage | Notes |
|----------|-----------|----------|-------|
| Separate `shapeHint` field | Low | ~60-70 simple chars | Decoupled from story; UI renders as a small visual note |
| Shape woven into story (pictographs) | Medium | ~20-30 chars | Tight 12-word budget when story also needs anchor + meaning |
| Component layout in story | Hard | ~100+ compound chars | Conflicts with design rule: stories must not rely on radical knowledge |
| Stroke-level narratives | Very Hard | All chars | Essentially a different mnemonic system (Heisig-style) |

**Recommended starting point:** Add an optional `shapeHint` field to
`mnemonicData` for the 35 radicals, where visual form ≈ meaning (口 is a
square = mouth, 人 is two legs = person). Display it below the story without
touching story text. Evaluate whether it measurably helps recall before
expanding to compound characters.

```json
mnemonicData: {
  soundAnchor: "Think of RUN.",
  story: "A lone traveler breaks into a RUN across the empty bridge.",
  shapeHint: "Two legs, one striding forward",
  components: []
}
```

**Key challenges:**
- Authoring quality shape descriptions requires knowing what each character
  looks like to a first-time learner — a different skill from writing phonetic
  stories. LLM generation would need character images or reliable pictographic
  etymology data.
- For compound characters, shape hints risk requiring radical knowledge the
  learner doesn't have yet (violating the existing design rule).
- For complex/abstract characters, forcing a visual description may hurt more
  than it helps — leave `shapeHint` empty for those.

### Sentence Deck

Add a fourth deck of full Chinese sentences to bridge the gap between
single-word recall and reading comprehension.

**Card shape:**

```json
{
  "id": "tatoeba-1234",
  "hanzi": "我喜欢西瓜。",
  "pinyin": "wǒ xǐhuān xīguā.",
  "english": "I like watermelon.",
  "audioId": 1234,
  "vocabWords": ["我", "喜欢", "西瓜"]
}
```

**Data sources (ranked):**

| Source | License | Sentences | Audio | Notes |
|--------|---------|-----------|-------|-------|
| [Tatoeba](https://tatoeba.org/en/downloads) | CC BY 2.0 FR (some CC0) | ~40 k+ Mandarin with English translations | 5,814 Mandarin recordings | Bulk TSV exports for sentences, translation links, audio IDs, and pinyin transcriptions |
| LLM-generated | Original (no license concern) | Unlimited | None (syllable fallback or TTS) | Full editorial control; can constrain vocab to HSK1/HSK2 words the learner already knows |

**Recommended approach — hybrid:**

1. Write a build script (like `build-phonetic-hints.js`) that ingests Tatoeba
   exports, filters for sentences where all/most characters come from the
   HSK1 vocab set, and keeps only entries with audio recordings.
2. Curate ~50–100 sentences into `data/sentence-data.json`.
3. Supplement with LLM-generated sentences for vocab words that Tatoeba
   doesn't cover well.
4. Sentence audio at runtime: `https://tatoeba.org/audio/download/{audioId}`
   (same CDN-at-runtime pattern as `hugolpz/audio-cmn`). Fallback to
   syllable-by-syllable `speakPinyin()` for sentences without recordings.

**UI/UX:**

- Reuse the existing three-stage card flow: stage 0 shows the Chinese
  sentence, stage 1 adds pinyin + audio, stage 2 reveals the English
  translation plus word-by-word gloss chips (e.g. `我 I` · `喜欢 like` ·
  `西瓜 watermelon`).
- The gloss chips reuse the existing `.chip-link` styling.
- New deck entry in `DECKS` (`sentence_to_english`) + `DECK_STORAGE_KEYS`.

**Implementation cost:**

| Task | Effort |
|------|--------|
| Build script to filter/curate Tatoeba exports | Medium |
| New `data/sentence-data.json` with curated entries | Medium |
| Register deck in `DECKS` + storage key | Low |
| Sentence audio playback (Tatoeba URL or syllable fallback) | Low–Medium |
| Word-by-word gloss chips on reveal | Medium |

**Open questions:**

- Should sentences be graded by lesson (e.g. "Lesson 1 sentences use only the
  first 10 vocab words") or offered as a single flat pool?
- Is a reverse mode (`english_to_sentence`) valuable, or is comprehension-only
  enough to start?
- Minimum audio-coverage threshold: skip sentences without audio, or accept
  the syllable fallback?
