# Mnemonic Curation Workflow

This project keeps runtime guardrails in the app, but mnemonic quality should be enforced in data before runtime.

## Data sources

Preferred open sources for draft seeds:

- Make Me a Hanzi (`dictionary.txt`) for structural etymology hints.
- Unihan (`Unihan_Readings.txt`, `kPhonetic`) for phonetic-family classes.
- CC-CEDICT (`cedict_ts.u8`) for character-level pinyin fallback.
- Optional cross-reference stories from Arthur944 / Koohii exports.

## Build seed file

```bash
node scripts/build-mnemonic-seeds.js \
  --makemeahanzi /path/to/dictionary.txt \
  --arthur /path/to/remembering-the-kanji-stories.csv \
  --koohii /path/to/koohii.csv \
  --out data/mnemonic-seeds/hsk1-seeds.json
```

## Audit current deck data

```bash
node scripts/audit-mnemonics.js --mode all
```

Fail CI-style when violations remain:

```bash
node scripts/audit-mnemonics.js --mode hsk1 --fail-on-violations
```

## Build phonetic hint suggestions

```bash
node scripts/build-phonetic-hints.js \
  --makemeahanzi /path/to/dictionary.txt \
  --unihan /path/to/Unihan_Readings.txt \
  --cedict /path/to/cedict_ts.u8 \
  --out data/mnemonic-seeds/hsk1-phonetic-hints.json
```

Output is per-character and includes:

- pinyin source provenance (`deck` or `cedict`)
- phonetic-family profile (MMH + Unihan)
- scored `Think of ALL CAPS.` anchor suggestions for manual review

## Migrate legacy data

Populate structured `mnemonicData` for cards that still only have `mnemonic`:

```bash
node scripts/migrate-mnemonic-data.js
```

## Quality rules

- For non-anchored stories: no English answer tokens in story text.
- For anchored stories (`soundAnchor` non-empty): explicitly link anchor + meaning in one coherent scene.
- No direct pinyin or pinyin-like fragments in story text.
- No explicit phonetic cue phrasing (`sounds like`, `think of`) in story text.
- No literal shape-descriptor phrasing in stories.
- Sound anchors, when used, must be canonical `Think of ALL CAPS.` English phrases.
- Avoid boilerplate templates; each story should be a natural sentence.

## Structured format

Use `mnemonicData` on cards:

```js
mnemonicData: {
  soundAnchor: "Think of CHEW.",
  story: "CHEW every bite slowly when you need to eat.",
  components: [{ hanzi: "日", meaning: "sun" }],
}
```

If a card cannot meet rules, leave the story empty and no mnemonic text will be shown on full reveal.
