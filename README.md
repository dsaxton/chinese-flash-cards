# Chinese Flash Cards

A lightweight SPA for learning Mandarin Chinese using spaced repetition. No frameworks, no build tools. It works as a plain `index.html` file and also supports Progressive Web App (PWA) install/offline features when served over HTTP(S).

## Usage

You can run this app in two modes:

- **Standalone file mode (`file://`)**: open `index.html` directly in a browser. Core flashcard functionality works.
- **PWA mode (`http://` or `https://`)**: serve the folder (or deploy to GitHub Pages) to enable installability and service-worker caching.

For local PWA testing, run the helper script from this directory:

```bash
./scripts/dev-server.sh
```

Optional: pass a custom port (default is `8787`):

```bash
./scripts/dev-server.sh 5173
```

Equivalent direct command:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

Then open the URL printed by the script (it auto-increments to the next free port if needed, starting from `8787`).

1. A Chinese character is displayed
2. Click to reveal the pinyin romanization and a speaker button
3. Click again to reveal the English meaning, radical chips, English-only mnemonic hint, optional cultural tidbit, and difficulty buttons
4. Rate your recall: **Hard** (forgot), **Medium** (remembered), or **Easy** (instant recall)
5. The next card appears
6. After finishing the queue, click **Replay lesson** to run the same lesson again in a reshuffled order

The speaker button can be clicked at any time after pinyin is revealed to hear the pronunciation. It does not advance the card.
From the review deck, use the buttons below the card to open `Pinyin` and `Radicals` study sections. Inside those sections, use the "Return to review deck" links (top or bottom) to go back.

Progress is saved in your browser's `localStorage` and persists across sessions. Use the "Reset Progress" button to start over.

## Spaced Repetition

Uses a simplified SM-2 algorithm. Each card tracks:

| Field | Description |
|---|---|
| `interval` | Days until next review |
| `ease` | Ease factor (starts at 2.5) |
| `repetitions` | Consecutive correct recalls |
| `due` | Next review date (ISO string) |

Difficulty buttons adjust these values:

- **Hard** — resets interval to 1 day, decreases ease by 0.2, resets repetitions
- **Medium** — advances interval by the ease factor
- **Easy** — advances interval by ease x 1.3, increases ease by 0.15

Cards due today or overdue are shown first (shuffled). When the review queue is empty, 10 new cards are introduced per session.

## Audio

Pronunciation audio uses human-recorded MP3s from [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn) (CC-BY-SA, 64kbps). Eight HSK 1 words without available recordings have been excluded from the app to avoid poor-quality fallback audio.

## Mnemonics & Radicals

Each reveal card includes:

- Radical chips (always shown) above the mnemonic
- An English-only mnemonic line

These break words into components and create visual stories to aid memorization. For example:

- **好** (good): 女 (woman) + 子 (child). A mother with her child — that's good!
- **家** (home): 宀 (roof) + 豕 (pig). A pig under a roof — in ancient China, keeping pigs meant a prosperous home.

## Cultural Tidbits

Reveal cards can show a short quote from classical Chinese texts, including:

- *Tao Te Ching* (《道德经》)
- *The Art of War* (《孙子兵法》)
- *Analects* (《论语》)

Each tidbit includes:

- Original Chinese quote
- English translation
- Inline attribution (for example: `— Sun Tzu, The Art of War`)
- Source citation and link
- Relevance selected entirely from English meaning overlap between the card definition and tidbit translation
- Short-quote preference (long classical passages are filtered out in review cards)
- Daily randomized rotation among multiple top candidates to reduce repeated tidbits

If no semantically relevant quote is found for a card, no cultural tidbit is shown for that card.

### Coverage Check

Run the coverage checker to verify how many vocab cards will show at least one cultural tidbit under current matching rules:

```bash
node scripts/check-tidbit-coverage.js 0.65
```

Optional arguments:

```bash
node scripts/check-tidbit-coverage.js <min_ratio> <max_raw_matches_per_word> <max_primary_share>
```

Example:

```bash
node scripts/check-tidbit-coverage.js 0.65 80 0.18
```

The command exits non-zero if any threshold fails:

- coverage ratio drops below `min_ratio`
- any single word matches more than `max_raw_matches_per_word` tidbits
- one tidbit becomes the primary match for more than `max_primary_share` of matched words

## Technical Details

- **App shell**: `index.html` + `manifest.webmanifest` + `sw.js` + `icons/` (`icon-192.png`, `icon-512.png`, `apple-touch-icon-180.png`)
- **No dependencies**: no npm, no build step, no framework
- **Responsive**: optimized for desktop and mobile viewports
- **Storage**: progress persists in `localStorage` under the key `chinese-flash-cards-progress`
- **Audio**: requires network access to fetch MP3s from GitHub
- **PWA**: installable and offline-capable for app shell pages when hosted over HTTP(S)
- **File mode compatibility**: when opened from disk (`file://`), service worker is skipped and the app still runs normally

## Code Structure

The JS is organized into sections separated by comment headers:

1. **Vocabulary** — HSK 1 + HSK 2 data with `hanzi`, `pinyin`, `english`, and `mnemonic` fields
2. **Audio** — `speak()` function that plays MP3s from the `hugolpz/audio-cmn` GitHub repo
3. **PWA setup** — `initPWA()` service worker registration (HTTP/S only)
4. **Persistence** — `loadProgress()` / `saveProgress()` wrappers around `localStorage`
5. **Spaced repetition** — `buildQueue()` for scheduling, `rateCard()` for SM-2 updates
6. **UI + routes** — `renderRoute()` switches between `review`, `pinyin`, and `radicals`; `renderReview()` manages the 3-stage flashcard flow (hanzi → pinyin → answer), cultural tidbit rendering, and lesson replay completion state

## License

Vocabulary data is public (HSK standard). Audio files are from [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn) under CC-BY-SA.
