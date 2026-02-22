# Lesson Expansion — Exploration

## Summary

After "All done for today!", offer learners the option to **continue studying** (more cards). This document reflects the **current app state** (post-quiz-mode merge) and updates the recommendation.

---

## Current Behavior (as of merge with master)

### Study flow

- **Tap-through only**: Stage 0 (prompt) → tap → Stage 1 (pinyin + audio) → tap → Stage 2 (full answer) → tap for next.
- **No difficulty buttons**: Hard/Medium/Easy have been removed from study.
- **No SRS update during study**: Progress is not modified while tapping through cards.

### Quiz flow

- **Trigger**: "Tap to take quiz" button on done screen (when `lessonQueue.length >= 2`).
- **Mechanism**: Multiple-choice questions over lesson cards. Correct → easy, incorrect → hard.
- **SRS**: `rateCardFromQuizResult()` updates progress. Quiz is the **only** way progress gets updated.

### Done screen

1. "All done for today!"
2. **Deck selection** — returns to deck picker
3. **Replay lesson** — shuffles `lessonQueue`, shows same cards again (same tap-through flow; no ratings)
4. **Tap to take quiz** — starts quiz over lesson cards (when ≥ 2 cards)

### Replay lesson

- `replayLesson()` sets `queue = shuffle(lessonQueue)`, `currentIndex = 0`
- Same tap-through flow as study: no difficulty buttons, no `rateCard()`
- **Effect**: Replay is already "without timers" — pure re-exposure, no progress change

### buildQueue logic

```js
// due: cards with progress where due <= today
// unseen: cards with no progress
baseQueue = [...shuffle(due), ...shuffle(unseen).slice(0, NEW_CARDS_PER_SESSION)]
```

**When does buildQueue return more cards?**

- **After quiz**: Progress updated. Unseen shrinks. `buildQueue` returns up to 10 new unseen cards (or due if any). → **Continue would show different cards.**
- **After study only (no quiz)**: Progress unchanged. Unseen unchanged. `buildQueue` returns the same pool (due + up to 10 unseen). Often the same cards. → **Continue could repeat or overlap.**

---

## Updated Recommendation

### What’s already covered

| Need | Status |
|------|--------|
| Replay without timers | ✅ Replay is tap-through; no ratings |
| Quiz for SRS | ✅ Quiz mode updates progress |

### Remaining gap: Continue

**Continue** = Start another lesson with more cards when `buildQueue` returns a non-empty queue.

- **Value**: After quiz, user has updated progress. Continue fetches up to 10 more new cards (or due cards). Lets motivated learners keep going.
- **When useful**: Right after quiz; or when returning later with due cards.

### Implementation

1. **expandLesson()**:
   ```js
   function expandLesson() {
     const deck = getActiveDeck();
     if (!deck) return;
     const extraQueue = buildQueue(deck.cards, progress);
     if (extraQueue.length === 0) return;
     queue = extraQueue;
     lessonQueue = [...lessonQueue, ...extraQueue]; // so Replay + Quiz include new cards
     currentIndex = 0;
     quizMode = false;
     renderStudyDeck();
   }
   ```

2. **Done screen**: Add "Continue" button when `buildQueue(deck.cards, progress).length > 0`.

3. **Optional**: Use a smaller cap for Continue (e.g. 5) to avoid overload. Requires `buildQueue(cards, progress, { newCardsCap: 5 })`.

### Edge cases

| Case | Behavior |
|------|----------|
| All cards seen, none due today | `buildQueue` returns `[]` — hide Continue |
| Study only, no quiz | Continue may return same/overlapping cards — acceptable (user can study again) |
| After quiz | Continue returns new cards — primary use case |
| Sentence deck | Same logic; `buildQueue` works for any deck |

---

## Simplified Phases

**Phase 1**  
- Add Continue button when `buildQueue(deck.cards, progress).length > 0`
- Use same `NEW_CARDS_PER_SESSION` for Continue
- Append new cards to `lessonQueue` so Replay and Quiz cover the expanded set

**Phase 2 (optional)**  
- Reduce Continue cap to 5 for "extra" sessions
- User preference for new cards per session

---

## Removed / Obsolete

- **"Replay (quick, no timers)"** — Replay already does this. No separate quick-replay mode needed.
- **Difficulty buttons on Replay** — Study flow has no difficulty buttons; Replay reuses it.
- **replayQuickMode flag** — Unnecessary; current Replay is already review-only.
