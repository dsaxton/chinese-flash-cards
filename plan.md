# Plan

## Priority 1: Mnemonic Quality Cleanup

### Goal
Upgrade mnemonic content so every retained story is a real memory aid (not structural filler), while preserving the no-answer/no-pronunciation-leak rules.

### Work
1. Audit both decks for non-mnemonic stories.
2. Remove non-mnemonic story text directly from source data.
3. Rewrite replacements using Make Me a Hanzi + community story references.
4. Keep only stories that are concrete, visual, and non-leaking.
5. **Expand sound-anchor coverage — currently 8/311 cards have anchors.**
   - Build `scripts/suggest-sound-anchors.js` to ingest Make Me a Hanzi
     (`phonetic`), Unihan (`kPhonetic`, `kMandarin`), and CC-CEDICT pinyin
     to propose anchors for each syllable.
   - Score candidates by phonetic-family agreement + English-word validity,
     minus penalties for meaning leakage and overuse; emit top 1–3 into
     `data/sound-anchor-suggestions.json` for manual review.
   - Curate and write approved anchors into `mnemonicData.soundAnchor`,
     integrating them naturally into story text with ALL-CAPS anchors and no
     English-answer leakage.
   - Add a CI check to fail when anchor coverage < 90% of HSK1 cards or when
     any anchor is not ALL CAPS / not an English word.
6. Purge filler “shape/side-form” blurbs (e.g., “This compact component appears in…”)
   and replace with actual mnemonic imagery or leave empty to hide the line.

### Acceptance
1. `scripts/audit-mnemonics.js` reports no violations.
2. Story quality spot checks pass for a representative HSK1 subset.

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

## Priority 3: Test/Quality Gates

### Goal
Strengthen guardrails for future data updates.

### Work
1. Add stronger mnemonic fixture snapshots for larger HSK1 subsets.
2. Add CI gate for `scripts/audit-mnemonics.js --fail-on-violations`.

### Acceptance
1. CI fails on mnemonic audit regressions.
2. Fixture tests catch narrative-quality regressions early.

## Future

1. Study guidance for combining decks effectively.
2. Tone imagery pilot (measure recall benefit vs added cognitive load).
3. Post-lesson “Expand/Continue” option so learners can keep going after the daily queue:
   offer to start the next lesson immediately (same deck), with an optional small cap
   on extra new cards; include a simple replay of finished cards without timers.
