# Plan

## Mnemonic Guardrails

### Goal
Keep mnemonic quality stable as data evolves: concrete visual stories, no leaks,
and anchors integrated safely.

### Ongoing checks

- `node scripts/audit-mnemonics.js --mode all`
- `node scripts/validate-anchor-stories.js`
- `node scripts/test-mnemonic-curation.js`
- `node scripts/test-hint-safety.js`

### Data-edit workflow

```bash
# 1. Export the subset you want to revise
node scripts/export-problem-stories.js > work/mnemonic-input.json

# 2. Draft updates and preview
node scripts/apply-story-rewrites.js --input work/mnemonic-output.json --dry-run

# 3. Apply and validate
node scripts/apply-story-rewrites.js --input work/mnemonic-output.json
node scripts/audit-mnemonics.js --mode all
node scripts/validate-anchor-stories.js
```

### Mnemonic invariants

1. **No English answer leakage** — except in anchored stories (see Task below):
   anchored stories are explicitly required to involve the English meaning.
2. No pinyin leakage in English-to-Hanzi hint profile.
3. No explicit phonetic cue phrases (`think of`, `sounds like`).
4. No literal shape-description filler.
5. No multi-word comma-separated `soundAnchor` values.
6. No "flashes into the scene" boilerplate.

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
