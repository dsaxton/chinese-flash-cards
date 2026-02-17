# Current State

Implemented:

- 3-deck flow with per-deck progress + migration from legacy single-deck storage.
- Stage-flow refactor:
  - `Hanzi to English`: Hanzi -> pinyin/audio -> mnemonic hint -> full reveal.
  - `English to Hanzi`: English -> mnemonic hint -> pinyin/audio -> full reveal.
  - `Radicals to English`: unchanged 2-stage reveal to full answer.
- Hint-safety guardrails in hint-only stages:
  - no direct pinyin leakage (where applicable),
  - no English-answer token leakage,
  - no explicit phonetic cue phrases (`think of ...`, `sounds like ...`),
  - no literal shape-description hints in E2H stage 1.
- Mnemonic cleanup/migration completed:
  - every card now has structured `mnemonicData` (`soundAnchor`, `story`, `components`),
  - stories that violate constraints are removed from data (empty story), and mnemonic hint stage is skipped for those cards,
  - radicals deck is fully curated with non-empty compliant stories,
  - HSK1 deck has no hint-safety violations (audit clean).
- Tooling added:
  - `scripts/build-mnemonic-seeds.js` (Make Me a Hanzi + optional cross-reference imports),
  - `scripts/audit-mnemonics.js` (deck-level quality audit),
  - `scripts/migrate-mnemonic-data.js` (one-time migration to structured data),
  - `scripts/test-mnemonic-curation.js` (data-first regression checks).
- Regression coverage includes full-deck hint safety + mnemonic curation tests.

# Remaining Work

## Mnemonics

1. Increase non-empty curated story coverage for HSK1 (currently many cards intentionally skip hint stage).
2. Improve sound-anchor quality for full-reveal contexts.
   - keep anchors intelligible, natural, and in ALL CAPS,
   - continue rejecting non-English pronunciation fragments.

## Tests

1. Add stronger curated fixture snapshots for a larger HSK1 subset.
2. Add a CI gate for `scripts/audit-mnemonics.js --fail-on-violations`.

## Future

- Study tips / guidance on how to combine the three decks effectively.
- Tone imagery system pilot (evaluate memory benefit vs cognitive load).
