# Plan

## Priority 1: Mnemonic Quality Cleanup

### Goal
Upgrade mnemonic content so every retained story is a real memory aid (not structural filler), while preserving the no-answer/no-pronunciation-leak rules.

### Work
1. Audit both decks for non-mnemonic stories.
2. Remove non-mnemonic story text directly from source data.
3. Rewrite replacements using Make Me a Hanzi + community story references.
4. Keep only stories that are concrete, visual, and non-leaking.
5. **Write sound anchors — currently missing from every card (all 311
   `soundAnchor` fields are empty).** The infrastructure exists but the data
   was never written. A sound anchor is an English word or phrase that
   approximates the syllable sound, written in ALL CAPS and integrated
   naturally into the story sentence. Example: 好 (hǎo) — "HOW wonderful
   when a woman and child are together." without one, the mnemonic only aids
   meaning recall, not pronunciation. Rules:
   - Must be a real English word/phrase, not a phonetic fragment
   - Must read naturally in the sentence (not feel bolted on)
   - ALL CAPS so it stands out visually
   - Must not leak the English meaning of the card

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
