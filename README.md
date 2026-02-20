# Chinese Flash Cards

Lightweight SPA for learning Mandarin Chinese with spaced repetition. No framework and no build step: the app runs from a single `index.html`.

## Run

- `file://` mode: open `index.html` directly.
- `http(s)://` mode: serve the directory to enable installable PWA + service-worker caching.

Local dev server:

```bash
./scripts/dev-server.sh
```

Optional custom port:

```bash
./scripts/dev-server.sh 5173
```

Equivalent command:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

## Decks

The app now uses a four-deck system with a deck selection landing screen:

1. `Hanzi to English`
2. `English to Hanzi`
3. `Radicals to English`
4. `Sentences (Sentence to English)`

Each deck has independent SM-2 progress in `localStorage`.

### Universal Card Flow (all decks)

1. Stage 0: prompt (`hanzi`, `english`, or `radical`)
2. Stage 1: prompt + pinyin + audio
3. Stage 2: full reveal (prompt + answer + pinyin/audio + mnemonic + chips + difficulty buttons + optional cultural tidbit)

## Spaced Repetition

Simplified SM-2 fields per card:

| Field | Meaning |
|---|---|
| `interval` | Days until next review |
| `ease` | Ease factor |
| `repetitions` | Consecutive successful recalls |
| `due` | Next due date (`YYYY-MM-DD`) |

Difficulty behavior:

- `Hard`: interval `1`, decrease ease, reset repetitions
- `Medium`: standard SM-2 progression
- `Easy`: larger interval growth, slight ease increase

Daily queue behavior:

- Due/overdue cards first (shuffled)
- Up to 10 new cards per session
- Replay current lesson available after finishing queue

## Persistence

Per-deck keys:

- `hanzi_to_english_progress`
- `english_to_hanzi_progress`
- `radicals_to_english_progress`

Additional key:

- `chinese-flash-cards-active-deck`

Migration:

- Legacy single-deck key `chinese-flash-cards-progress` is migrated into `hanzi_to_english_progress` (when that deck key is empty).

## Audio

Pronunciation audio is generated locally using [edge-tts](https://github.com/rany2/edge-tts), which interfaces with Microsoft Edge's online neural TTS service. The generated MP3 files are committed to `data/audio/` and served as static assets — no external audio fetches at runtime.

### Generating audio

Requires [uv](https://docs.astral.sh/uv/). No manual virtual environment setup needed — the script uses [PEP 723](https://peps.python.org/pep-0723/) inline metadata so `uv` handles dependencies automatically:

```bash
uv run scripts/generate-audio.py
```

The script reads `data/deck-data.json` and `data/sentence-data.json`, collects every unique hanzi string (vocab words, radicals, and full sentences), and generates one MP3 per entry using the `zh-CN-XiaoxiaoNeural` voice. It is incremental — existing files are skipped, so only new entries are generated on subsequent runs.

### File naming

Audio filenames are the **hex-encoded UTF-8 bytes** of the hanzi string, plus an `.mp3` extension. For example:

| Hanzi | UTF-8 bytes (hex) | Filename |
|-------|-------------------|----------|
| 爱 | `e7 88 b1` | `e788b1.mp3` |
| 谢谢 | `e8 b0 a2 e8 b0 a2` | `e8b0a2e8b0a2.mp3` |
| 我喜欢吃米饭。 | `e6 88 91 e5 96 9c e6 ac a2 e5 90 83 e7 b1 b3 e9 a5 ad e3 80 82` | `e68891e596...8082.mp3` |

This scheme is deterministic (same input always produces the same filename), reversible, and keeps filenames ASCII-safe with no need for URL-encoding or escaping.

A manifest at `data/audio/manifest.json` maps every hanzi string to its filename for runtime lookup.

## Mnemonic Guardrails

Mnemonic rendering uses structured data (`soundAnchor`, `story`, `components`) for deck content.

Guardrails:

- Explicit `"sounds like: ..."` wording is forbidden.
- Sound anchors must resolve to intelligible English phrase output and use ALL CAPS for clue words (for example: `Think of TEA.`).
- Non-English pronunciation fragments are rejected as anchors.
- Structured `mnemonicData.soundAnchor` values are normalized to the same canonical ALL-CAPS format.
- Stories may integrate a configured phonetic alias fragment (see `phoneticAnchorAliases`) when forcing the raw anchor token would make the sentence unnatural.
- Anchored stories must be coherent English and tie the anchor to the card meaning.
- Stories must paint a concrete, pictureable scene — meta-template language that narrates the mnemonic system (e.g. "I recall X when Y appears") is forbidden.
- For anchored stories, meaning words are allowed by design; for non-anchored stories, answer leakage remains forbidden.
- Mnemonics appear only on full reveal (not intermediate stages).
- Invalid stories are skipped at data level (not rewritten at runtime).
- Empty stories intentionally hide the mnemonic line for that card.

## Mnemonic Curation

### Provenance

All mnemonic content in `data/deck-data.json` is **original or LLM-generated**. No third-party dataset text has been imported into the committed card data.

**Sound anchors (`soundAnchor`):** Each anchor maps a pinyin syllable to a near-homophone English word (e.g. `bù → BOO`, `chī → CHEW`, `ài → EYE`). Anchors were selected from a hand-curated pinyin→English sound-alike table in `data/phonetic-config.json`. Tooling scripts (`build-phonetic-hints.js`) can optionally cross-reference Make Me a Hanzi, Unihan, and CC-CEDICT to surface phonetic-family candidates for review, but no output from those scripts has ever been committed.

**Stories (`story`):** Initial stories were hand-written. Problem stories (fragments, answer leakers, incoherent anchors) were later rewritten by LLM and applied via `scripts/apply-story-rewrites.js`. External sources such as Koohii, Heisig/Arthur CSV, and Make Me a Hanzi are referenced as optional seed inputs in `build-mnemonic-seeds.js` but were never used to populate the committed data.

**Coverage (current):** 311/311 cards (vocab + radicals) have both anchor + story; 0 cards are missing either field.

### Tooling

Audit current data quality:

```bash
node scripts/audit-mnemonics.js --mode all --fail-on-violations
node scripts/validate-anchor-stories.js
node scripts/test-mnemonic-curation.js
```

`test-mnemonic-curation.js` enforces story-template diversity, anchor-placement diversity, and a meta-template ban so repetitive, anchor-first, or system-narrating phrasing regresses fast.

Review and rewrite workflow:

```bash
node scripts/export-problem-stories.js > work/phase1-input.json
node scripts/export-missing-stories.js > work/phase2-input.json
node scripts/apply-story-rewrites.js --input work/output.json --dry-run
node scripts/apply-story-rewrites.js --input work/output.json
```

Offline seed generators (require external datasets, output not committed):

```bash
node scripts/build-mnemonic-seeds.js --makemeahanzi /path/to/dictionary.txt --out data/mnemonic-seeds/hsk1-seeds.json
node scripts/build-phonetic-hints.js \
  --makemeahanzi /path/to/dictionary.txt \
  --unihan /path/to/Unihan_Readings.txt \
  --cedict /path/to/cedict_ts.u8 \
  --out data/mnemonic-seeds/hsk1-phonetic-hints.json
```

See `docs/mnemonic-curation.md` for quality rules and data format details.

## Cultural Tidbits

Short quotes from classical Chinese sources are selected via English-meaning token overlap and displayed on full-reveal cards across all decks when a strong match exists.

## Tests

Run all regression checks:

```bash
node scripts/test-tidbit-data.js
node scripts/test-tidbit-selection.js
node scripts/test-deck-regression.js
node scripts/test-audio-coverage.js
node scripts/test-hint-safety.js
node scripts/test-mnemonic-curation.js
node scripts/test-phonetic-hint-pipeline.js
```

Optional curation helpers:

```bash
node scripts/check-tidbit-coverage.js 0.80
node scripts/report-unmatched-tidbits.js
```

## Structure

- `index.html`: app UI, data, routing, SM-2 logic
- `data/deck-data.json`: raw deck data used by runtime loader
- `data/tidbit-data.json`: raw tidbit data used by runtime loader
- `data/phonetic-config.json`: phonetic anchor candidate + allow-list config
- `data/audio/`: generated MP3 pronunciation files + `manifest.json`
- `sw.js`, `manifest.webmanifest`, `icons/`: PWA shell assets
- `scripts/`: validation and coverage tooling
- `scripts/generate-audio.py`: audio generation script (run via `uv run`)

## License

Vocabulary is public standard HSK content. Audio files are generated using Microsoft Edge's neural TTS service via [edge-tts](https://github.com/rany2/edge-tts).
