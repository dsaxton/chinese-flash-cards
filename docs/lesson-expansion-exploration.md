# Lesson Expansion — Exploration

## Summary

After "All done for today!", offer learners the option to **continue studying** (more cards) or **replay** the finished cards in a lightweight way. This document explores the current behavior, design options, and implementation approach.

---

## Current Behavior

### When the queue is exhausted

1. `currentIndex >= queue.length` → show "All done for today!"
2. **Deck selection** link — returns to deck picker
3. **Replay lesson** button — if `lessonQueue.length > 0`, shuffles `lessonQueue` and restarts the same cards

### Replay lesson today

- `replayLesson()` sets `queue = shuffle(lessonQueue)` and `currentIndex = 0`
- Same card flow: stage 0 → 1 → 2, difficulty buttons, `rateCard()` updates progress
- **Effect**: Cards are rated again; SM-2 intervals are overwritten (e.g. Easy→4 days becomes whatever the user rates on replay)
- No "without timers" — replay is full SRS with difficulty ratings

### buildQueue logic

```js
// due: cards with progress where due <= today
// unseen: cards with no progress
baseQueue = [...shuffle(due), ...shuffle(unseen).slice(0, NEW_CARDS_PER_SESSION)]
```

After a lesson, progress is updated. Cards just seen have future due dates. So a second call to `buildQueue(cards, progress)` yields:
- **due**: empty (we just rated everything; nothing is due today)
- **unseen**: remaining new cards (up to 10)
- **Result**: Up to 10 more new cards, or `[]` if deck is exhausted

---

## Proposed: Lesson Expansion

### Two distinct actions

| Action | Description | Progress impact |
|--------|-------------|-----------------|
| **Continue** | Start a new lesson with more cards (due + new, same cap). | Yes — normal SM-2 |
| **Replay** (quick) | Flip through finished cards again, no difficulty buttons. | No — no progress change |

### Continue

- Call `buildQueue(deck.cards, progress)` again
- If non-empty: `queue = result`, `lessonQueue = [...lessonQueue, ...queue]` (optional: extend lessonQueue so replay includes new cards)
- If empty: show "No more cards today" or hide the Continue button
- **New cards cap**: Plan says "optional cap on extra new cards." Options:
  - Same cap (10) — simplest
  - Reduced cap (e.g. 5) for "extra" sessions — avoids overload
  - User preference (future)

### Replay (quick, no timers)

- Show same cards (`lessonQueue`) in a **review-only** mode:
  - Tap to advance stages (prompt → pinyin → full answer)
  - No Hard/Medium/Easy — just "Next" or tap to next card
  - No `rateCard()` — progress unchanged
- Purpose: Re-exposure without affecting SRS; good for "let me see these again before I stop"

### UI on "All done"

```
All done for today!

[Deck selection]

[Continue]  — if buildQueue returns non-empty
[Replay]    — quick review of finished cards (no ratings)
```

Or:

```
[Deck selection]  [Continue]  [Replay]
```

---

## Implementation Sketch

### 1. buildQueue with configurable new-card cap

```js
function buildQueue(cards, progress, options = {}) {
  const newCap = options.newCardsCap ?? NEW_CARDS_PER_SESSION;
  // ...
  const baseQueue = [...shuffle(due), ...shuffle(unseen).slice(0, newCap)];
  // ...
}
```

- `startNewLessonFromProgress()` uses default cap
- "Continue" can use `newCardsCap: 5` or same as default

### 2. expandLesson (Continue)

```js
function expandLesson() {
  const deck = getActiveDeck();
  if (!deck) return;
  const extraQueue = buildQueue(deck.cards, progress, { newCardsCap: 5 });
  if (extraQueue.length === 0) return; // or show "No more cards"
  queue = extraQueue;
  lessonQueue = [...lessonQueue, ...extraQueue]; // optional
  currentIndex = 0;
  renderStudyDeck();
}
```

### 3. replayLessonQuick (Replay, no timers)

- New mode flag: `replayQuickMode = true`
- In `renderStudyDeck` / card render:
  - If `replayQuickMode`: hide difficulty buttons, show "Next" or advance on final tap
  - On card completion: `currentIndex++`, no `rateCard()`
  - When `currentIndex >= queue.length`: exit quick mode, show done screen again
- `replayLesson()` sets `replayQuickMode = true`, `queue = shuffle(lessonQueue)`, `currentIndex = 0`

### 4. Done screen updates

- Add "Continue" button when `buildQueue(deck.cards, progress).length > 0`
- Change "Replay lesson" to "Replay (quick review)" and wire to `replayLessonQuick`
- Or keep current Replay as "Replay with ratings" and add "Quick review" as separate button

---

## Edge Cases

| Case | Behavior |
|------|----------|
| All cards seen, none due | `buildQueue` returns `[]` — hide Continue |
| All cards seen, some due tomorrow | Same — hide Continue (nothing due today) |
| Deck exhausted (e.g. 50 cards, all seen, all future-due) | Continue hidden |
| Replay quick, then Continue | Clear `replayQuickMode`, run expandLesson |
| Sentence deck | Same flow; sentence cards use same queue/rating logic |

---

## Open Questions

1. **lessonQueue scope**: Should Continue append new cards to `lessonQueue` so Replay includes them? Or keep Replay limited to the original lesson?
2. **Continue cap**: Use 5, 10, or make it configurable?
3. **Replay naming**: "Replay" vs "Quick review" vs "Review again" — which is clearest?
4. **Sentence deck**: Any special handling? Same logic should work.

---

## Recommended Phases

**Phase 1 (minimal)**  
- Add Continue button when more cards available  
- Use same `NEW_CARDS_PER_SESSION` for Continue (no reduced cap yet)

**Phase 2**  
- Add quick Replay (no ratings, no progress)  
- Reduce Continue cap to 5 for "extra" sessions (optional)

**Phase 3**  
- User preference for new cards per session (affects both initial and Continue)
