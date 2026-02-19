# Plan

## Mnemonic Curation

> Design principles, quality rules, and tooling: **`docs/mnemonic-curation.md`**

Run after any data edit:

```bash
node scripts/audit-mnemonics.js --mode all --fail-on-violations
node scripts/validate-anchor-stories.js
node scripts/test-mnemonic-curation.js
node scripts/test-hint-safety.js
```

### Completed
- Meta-template ban: added `isMetaTemplateStory()` detector to quality lib, `-40` penalty in scorer, hard assertion in test suite.
- Rewrote all 272 meta-template stories as concrete, pictureable scenes.
- Clarified dual-proximity doctrine: dual proximity is a property of the *story*, not the anchor word.
- Anchor grammar gate: added `isAnchorGrammaticallyIsolated()` detector to catch anchors jammed before nouns with no connector, `-30` penalty in scorer, hard assertion for radical cards.
- Shared-anchor distinctness gate: cards sharing the same anchor word must have low story word-overlap.
- Per-deck anchor placement cap: radical stories held to ≤ 50% anchor-first (global cap remains 60%).
- Rewrote 26 radical stories — anchors now fill real grammatical slots, placement diversity at 14%.
- All 311 stories now pass the full curation test suite.
- Sound anchor audit: fixed 11 anchor-syllable mismatches where anchors poorly approximated the Chinese sound (e.g. DAY→DONG for 懂 dǒng, MAMA→MEN for 门 mén, CHAIN→SWORE for 错 cuò). Rewrote 2 additional stories for broken grammar (让) and missing meaning link (非常).
- Pinyin-leak exclusion: audit and test scripts now exclude the anchor word itself from pinyin-leak detection — anchors that match the romanization are by design, not leaks.

### Next Steps (Mnemonic)
1. Address remaining `anchored_no_meaning_hit` stories (score 75) — grammar particles, abstract meanings.
2. Extend anchor grammar gate to vocab stories (currently enforced for radicals only).
3. Expand `phoneticAnchorAliases` for anchors where exact token usage harms sentence quality.
4. Add a small fixed snapshot set for narrative quality in CI to catch accidental template drift.
5. Pilot stricter anchor-placement cap (reduce max anchor-at-start from 60% to 40% if quality holds).
6. Diversify "family anchors" — SHE/ZOO/YOU/SHEER each cover 18–21 syllables; find more precise per-syllable anchors where feasible.
7. Find a better anchor for 次 cì (CHAIN) — Mandarin "ts" initial has no clean English single-word equivalent.

---

## Priority 2: Cultural Tidbit Quality Expansion

### Goal
Improve quote quality/coverage now that tidbits are available across all decks.

### Work
1. Expand tidbit corpus for more radical concepts with concrete semantic overlap.
2. Curate/adjust relevance tags for better radical matches while preserving precision.
3. Add spot-check fixtures for additional radicals beyond `木` and `水`.

### Acceptance
1. More radical cards surface high-quality tidbits where overlap is meaningful.
2. Weak/abstract radicals still return `null` (no forced matches).

---

## Priority 3: Test/Quality Gates

### Goal
Strengthen guardrails for future data updates.

### Work
1. Add stronger mnemonic fixture snapshots for larger HSK1 subsets.
2. Add CI gate for `scripts/audit-mnemonics.js --fail-on-violations`.

### Acceptance
1. CI fails on mnemonic audit regressions.
2. Fixture tests catch narrative-quality regressions early.

---

## Future

1. Study guidance for combining decks effectively.
2. Tone imagery pilot (measure recall benefit vs added cognitive load).
3. Post-lesson "Expand/Continue" option so learners can keep going after the daily queue:
   offer to start the next lesson immediately (same deck), with an optional small cap
   on extra new cards; include a simple replay of finished cards without timers.

### Visual Shape Hints for Hanzi

Stories currently carry two hooks: **sound** (phonetic anchor) and **meaning**
(scene). A third hook — **visual shape** of the character — could strengthen
recall, especially for simple pictographic characters.

**Approaches, ranked by feasibility:**

| Approach | Difficulty | Coverage | Notes |
|----------|-----------|----------|-------|
| Separate `shapeHint` field | Low | ~60-70 simple chars | Decoupled from story; UI renders as a small visual note |
| Shape woven into story (pictographs) | Medium | ~20-30 chars | Tight 12-word budget when story also needs anchor + meaning |
| Component layout in story | Hard | ~100+ compound chars | Conflicts with design rule: stories must not rely on radical knowledge |
| Stroke-level narratives | Very Hard | All chars | Essentially a different mnemonic system (Heisig-style) |

**Recommended starting point:** Add an optional `shapeHint` field to
`mnemonicData` for the 35 radicals, where visual form ≈ meaning (口 is a
square = mouth, 人 is two legs = person). Display it below the story without
touching story text. Evaluate whether it measurably helps recall before
expanding to compound characters.

```json
mnemonicData: {
  soundAnchor: "Think of RUN.",
  story: "A lone traveler breaks into a RUN across the empty bridge.",
  shapeHint: "Two legs, one striding forward",
  components: []
}
```

**Key challenges:**
- Authoring quality shape descriptions requires knowing what each character
  looks like to a first-time learner — a different skill from writing phonetic
  stories. LLM generation would need character images or reliable pictographic
  etymology data.
- For compound characters, shape hints risk requiring radical knowledge the
  learner doesn't have yet (violating the existing design rule).
- For complex/abstract characters, forcing a visual description may hurt more
  than it helps — leave `shapeHint` empty for those.
