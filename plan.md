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

### Next Steps
1. Expand `phoneticAnchorAliases` for anchors where exact token usage harms sentence quality.
2. Add narrative quality snapshot fixtures in CI to catch accidental template drift.
3. Pilot stricter anchor-placement cap (reduce max anchor-at-start from 60% to 40% if quality holds).
4. Diversify remaining "family anchors" — SHE/ZOO/YOU/SHEER still cover 15–20 syllables each; further per-syllable splits need new anchor words or alias support.
5. Improve anchor grammar gate heuristic to reduce false positives on natural pronoun/adverb subjects before enabling for vocab (125 false positives at current sensitivity).
6. **Multi-syllable phonetic hints** — Add more than one phonetic anchor to stories when pinyin has multiple syllables (e.g. 电脑 → "Think of DEAN, NOW."). See `docs/pinyin-multi-syllable-hints-investigation.md`.

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
