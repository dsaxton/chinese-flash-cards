# Mnemonic Curation Workflow

This project keeps runtime guardrails in the app, but mnemonic quality should be enforced in data before runtime.

## Data sources

Preferred open sources for draft seeds:

- Make Me a Hanzi (`dictionary.txt`) for structural etymology hints.
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

## Migrate legacy data

Populate structured `mnemonicData` for cards that still only have `mnemonic`:

```bash
node scripts/migrate-mnemonic-data.js
```

## Quality rules

- No English answer tokens in story text.
- No direct pinyin or pinyin-like fragments in story text.
- No explicit phonetic cue phrasing (`sounds like`, `think of`) in story text.
- No literal shape-descriptor phrasing in stories.
- Sound anchors, when used, must be canonical `Think of ALL CAPS.` English phrases.

## Structured format

Use `mnemonicData` on cards:

```js
mnemonicData: {
  soundAnchor: "Think of SUN, then LIGHT.",
  story: "A clear image that cues recall without revealing the answer.",
  components: [{ hanzi: "日", meaning: "sun" }],
}
```

If a card cannot meet rules, leave the story empty and no mnemonic text will be shown on full reveal.
