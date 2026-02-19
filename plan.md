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

### Next Steps (Mnemonic)
1. Curate low-scoring stories from `node scripts/score-story-relevance.js --non-empty --limit 40` with priority on non-HSK1 vocab.
2. Expand `phoneticAnchorAliases` for weak anchors where exact token usage still harms sentence quality.
3. Add a small fixed snapshot set for narrative quality in CI to catch accidental template drift.
4. Pilot stricter anchor-placement cap after one more rewrite pass (reduce max anchor-at-start from 60% to 40% if quality holds).

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
