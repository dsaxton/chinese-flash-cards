# Issues

(none)

# Remaining Work

## Mnemonics

1. **Curate structured mnemonic data across the deck**
   - Populate `mnemonicData` (`soundAnchor`, `story`, `components`) per card
     instead of relying on parser-derived fallback from legacy `mnemonic`.
   - Keep `English to Hanzi` stage-1 hints English-only and indirect:
     no hanzi, no pinyin, no chips, no literal shape descriptions.

2. **Improve anchor quality**
   - Replace weak or awkward anchors with natural English words/phrases.
   - Keep anchors intelligible and integrated with story tone.
   - Avoid pronunciation-fragment leakage.

3. **Add mnemonic-quality tests**
   - Add high-level checks that stage-1 reverse hints stay indirect.
   - Add curated spot checks for representative words/radicals.

## Future

- Study tips / guidance on how to combine the three decks effectively.
- Tone imagery system pilot (evaluate memory benefit vs cognitive load).
