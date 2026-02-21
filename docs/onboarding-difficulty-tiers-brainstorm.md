# Brainstorm: Tiered Difficulty & New User Onboarding

## Context

Chinese Flash Cards is an HSK-based Mandarin learning app with four decks (Hanzi→English, English→Hanzi, Radicals→English, Sentences), SM-2 spaced repetition, and a three-stage card flow. There is currently no onboarding and no learner-level difficulty tiers.

---

## Part 1: Tiered Difficulty (Beginner / Intermediate / Advanced)

### What "Difficulty" Could Mean

| Dimension | Beginner | Intermediate | Advanced |
|-----------|----------|--------------|----------|
| **Content scope** | HSK1 only (143 cards) | HSK1 + radicals + early HSK2 | Full vocab + radicals + sentences |
| **Deck availability** | Hanzi→English only | + English→Hanzi, Radicals | All 4 decks |
| **Card complexity** | Single characters, simple words | Multi-char words, radicals | Full sentences, cultural tidbits |
| **Hint scaffolding** | Pinyin + audio on first tap | Pinyin on second tap | No pinyin until reveal |
| **New cards per session** | 5 | 10 | 15–20 |
| **Mnemonic visibility** | Always shown | Shown by default, can hide | Optional / learner toggle |
| **Cultural tidbits** | Hidden (reduce cognitive load) | Shown | Shown + optional deep-dive |

### Proposed Tier Definitions

**Beginner**
- First-time learners, no prior Mandarin exposure
- Goals: Build recognition, learn pinyin, establish mnemonics
- Content: HSK1 vocab only, Hanzi→English deck
- Scaffolding: Full hints (pinyin, audio) early; mnemonics always visible
- Pace: 5 new cards/day, smaller intervals for "Hard"

**Intermediate**
- Can recognize ~50+ characters, understands pinyin basics
- Goals: Production (recall Hanzi from English), radicals, sentence context
- Content: HSK1 + radicals; optionally early HSK2
- Scaffolding: Delayed pinyin reveal; mnemonics shown by default
- Pace: 10 new cards/day, standard SM-2

**Advanced**
- Comfortable with HSK1, ready for sentences and nuance
- Goals: Reading comprehension, cultural context, fluency
- Content: All decks, full sentence deck, cultural tidbits
- Scaffolding: Minimal hints; optional mnemonic toggle
- Pace: 15+ new cards/day, "Expand/Continue" post-lesson

### Implementation Considerations

1. **Tier selection**
   - Self-reported: "How much Mandarin have you studied?" → Beginner / Some / A lot
   - Or: Short placement quiz (5–10 cards) → infer tier from accuracy
   - Or: Start everyone as Beginner; unlock tiers as progress thresholds are met

2. **Tier persistence**
   - Store in `localStorage`: `chinese-flash-cards-difficulty-tier`
   - Allow manual override in settings

3. **Unlock vs. hard gates**
   - **Unlock model**: All content visible; tier affects defaults (new cards, hints) but user can change
   - **Gate model**: Intermediate unlocks after X cards learned; Advanced after Y
   - Recommendation: Unlock model for flexibility; tier affects defaults only

---

## Part 2: New User Onboarding

### Goals

- Reduce first-session overwhelm
- Explain the three-stage card flow
- Set expectations (spaced repetition, daily practice)
- Optionally capture tier preference

### Onboarding Flow Options

**Option A: Minimal (3 screens)**
1. Welcome: "Learn Mandarin with spaced repetition."
2. How it works: "Tap to reveal pinyin → tap again for answer → rate Easy/Medium/Hard."
3. Choose deck (or auto-start Hanzi→English for beginners).

**Option B: Guided first card**
1. Welcome + one-line explanation.
2. First card is a "demo" card (e.g., 你好) with inline coach tips: "Tap to hear pronunciation" → "Tap again to see meaning" → "Rate how well you knew it."
3. Then normal flow.

**Option C: Full onboarding**
1. Welcome + value prop.
2. Experience level → set tier.
3. How it works (visual: stage 0 → stage 1 → stage 2).
4. Deck recommendation based on tier.
5. Optional: "Daily goal" (5 / 10 / 15 new cards).
6. Start first lesson.

### Key Messages to Communicate

| Message | Where |
|---------|-------|
| Spaced repetition = review at optimal intervals | Welcome or "How it works" |
| Tap card to progress (no separate "flip" button) | First card or tooltip |
| Easy/Medium/Hard affects when you see the card again | After first rating or in help |
| Mnemonics help memory (sound anchor + story) | On first mnemonic reveal |
| Radicals build character recognition | When unlocking Radicals deck |

### Technical Hooks

- **First visit detection**: `localStorage.getItem("chinese-flash-cards-onboarding-seen")` → if null, show onboarding
- **Skip option**: "I've used this before" → set flag, go to deck selection
- **Progressive disclosure**: Show deck selection first; optional "How it works" link for those who want it

### UX Principles

- **Short**: < 60 seconds to first card for eager users
- **Skippable**: Don't block power users
- **Contextual**: Consider tooltips on first use of each feature (e.g., first time seeing mnemonic, first time rating)
- **Persistent help**: "?" or "How it works" always available from deck selection or study view

---

## Part 3: Integration Ideas

### Tier + Onboarding Together

1. **Onboarding asks**: "Have you studied Mandarin before?" → Yes/No/A little
2. **Tier assignment**: No → Beginner; A little → Intermediate; Yes → Advanced (or placement quiz)
3. **First session**: Beginner sees 5 new cards, full hints; Advanced sees 10, minimal hints
4. **Deck order**: Beginner lands on Hanzi→English; others see full deck grid with recommendation badges

### Progress-Based Tier Unlocks (Optional)

- After 20 cards learned in Hanzi→English → suggest English→Hanzi
- After 50 cards learned → suggest Radicals deck
- After 80 cards + radicals started → suggest Sentences deck
- Could surface as "New deck available" toast or badge on deck selection

### Settings Panel Additions

- **Difficulty tier**: Beginner / Intermediate / Advanced (manual override)
- **New cards per session**: 5 / 10 / 15 / 20
- **Show mnemonics**: Always / Optional (tap to reveal) / Never
- **Show cultural tidbits**: On / Off
- **Reset onboarding**: Show onboarding again (for demo or re-exploration)

---

## Part 4: Open Questions

1. **Placement quiz**: Worth the extra friction? Or is self-report sufficient?
2. **Tier auto-promotion**: Should the app suggest "You might be ready for Intermediate" after X days / Y cards?
3. **Sentence deck tiering**: Should sentences be gated by vocab progress (e.g., only show sentences using words you've learned)?
4. **Radicals first?**: Some curricula teach radicals before vocab. Should Beginner optionally start with Radicals?
5. **Localization**: Onboarding in Chinese for heritage speakers? Or English-only for now?

---

## Summary: Recommended MVP

**Tiered difficulty**
- Three tiers (Beginner / Intermediate / Advanced) affecting: new cards per session, default hint behavior, deck recommendations
- Self-reported tier at onboarding; stored in localStorage; overridable in settings
- Unlock model: tier affects defaults, not hard gates

**Onboarding**
- 2–3 screen flow: Welcome → How it works (tap to reveal) → Tier selection → Deck selection
- First-visit detection; skippable
- Optional: one "guided" first card with inline tips

**Implementation order**
1. Onboarding flow (welcome + how it works + first-visit flag)
2. Tier selection in onboarding + localStorage
3. Wire tier to new-cards-per-session and deck defaults
4. Add settings panel for tier override and hint preferences
5. (Later) Progress-based deck suggestions and tier auto-promotion
