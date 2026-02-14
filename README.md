# Chinese Flash Cards

A single-file SPA for learning Mandarin Chinese using spaced repetition. Covers 143 words from the HSK 1 vocabulary list. No frameworks, no build tools — just open `index.html` in a browser.

## Usage

Open `index.html` directly in any modern browser (Chrome, Firefox, Safari, Edge).

1. A Chinese character is displayed
2. Click to reveal the pinyin romanization and a speaker button
3. Click again to reveal the English meaning, a mnemonic hint, and difficulty buttons
4. Rate your recall: **Hard** (forgot), **Medium** (remembered), or **Easy** (instant recall)
5. The next card appears

The speaker button can be clicked at any time after pinyin is revealed to hear the pronunciation. It does not advance the card.

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

## Mnemonics

Each card includes a radical decomposition mnemonic shown alongside the English meaning. These break characters into their component radicals and create visual stories to aid memorization. For example:

- **好** (good): 女 (woman) + 子 (child). A mother with her child — that's good!
- **家** (home): 宀 (roof) + 豕 (pig). A pig under a roof — in ancient China, keeping pigs meant a prosperous home.

## Technical Details

- **Single file**: all HTML, CSS, and JS in `index.html` (~530 lines)
- **No dependencies**: no npm, no build step, no framework
- **Responsive**: works on desktop and mobile viewports
- **Storage**: progress persists in `localStorage` under the key `chinese-flash-cards-progress`
- **Audio**: requires network access to fetch MP3s from GitHub

## Code Structure

The JS is organized into four sections separated by comment headers:

1. **Vocabulary** — the 143-word HSK 1 dataset with hanzi, pinyin, english, and mnemonic fields
2. **Audio** — `speak()` function that plays MP3s from the `hugolpz/audio-cmn` GitHub repo
3. **Persistence** — `loadProgress()` / `saveProgress()` wrappers around `localStorage`
4. **Spaced repetition** — `buildQueue()` for scheduling, `rateCard()` for SM-2 updates
5. **UI** — `renderCard()` manages a 3-stage reveal flow (hanzi → pinyin → answer)

## License

Vocabulary data is public (HSK standard). Audio files are from [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn) under CC-BY-SA.
