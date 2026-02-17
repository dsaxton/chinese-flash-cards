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
- Regression coverage includes a full-deck hint safety test.

# Remaining Work

## Mnemonics

1. Curate structured mnemonic data across the deck.
   - Populate `mnemonicData` (`soundAnchor`, `story`, `components`) per card.
   - Reduce reliance on parser fallback from legacy `mnemonic`.
2. Improve story quality.
   - Remove awkward phrasing and direct-meaning leakage from legacy stories.
   - Keep cues memorable but indirect.
3. Improve sound-anchor quality for full-reveal contexts.
   - Keep anchors intelligible, natural, and in ALL CAPS.
   - Continue rejecting non-English pronunciation fragments.

## Tests

1. Add curated spot-check fixtures for representative words/radicals (beyond regex-level guards).
2. Add targeted tests for `mnemonicData`-first cards once curation lands.

## Future

- Study tips / guidance on how to combine the three decks effectively.
- Tone imagery system pilot (evaluate memory benefit vs cognitive load).
