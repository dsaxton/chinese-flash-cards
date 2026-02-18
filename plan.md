# Plan

## Mnemonic Design Principles

> Full authoritative reference: **`docs/mnemonic-curation.md`**


### CRITICAL: What a story may rely on

A story is only useful if the learner can activate it from what they already
know. The only things a learner reliably knows when they see a card are:

1. **The sound of the word** — via the phonetic anchor (ALL CAPS English word)
2. **The visual shape of the character** — what it looks like on screen
3. **The English meaning** — which is the answer they are trying to recall

**Stories must be grounded in one or more of these three things.**

Stories must NOT rely primarily on radical or component meanings as memory
hooks. A learner seeing 住 (to live) does not necessarily know that 亻 means
"person" or that 主 means "master/owner." A story built on those component
meanings ("a lone figure meets a master near the gate") is useless to anyone
who hasn't already memorized those radicals — which is most learners at HSK1.

Component meanings may appear as supporting color, but the story must stand
on its own using sound, shape, and/or meaning alone.

### The three valid hooks

| Hook | How to use it |
|------|--------------|
| **Sound** | Anchor word in ALL CAPS. The scene involves the anchor doing or causing something related to the meaning. |
| **Shape** | Describe what the character visually resembles. Useful for simple, iconic characters (人, 口, 日, 大, 山). |
| **Meaning** | State or evoke the English meaning directly in the scene. For anchored stories this is required; for unanchored stories, evoke it without stating it outright. |

### Examples

| hanzi | english | hook(s) used | story |
|-------|---------|-------------|-------|
| 不 | not; no | sound + meaning | "The crowd BOOs — NO, they will not allow it." |
| 大 | big | shape + sound + meaning | "The biggest DAY fills the whole sky — arms stretched wide." |
| 口 | mouth | shape + meaning | "A square opening — a mouth calling out." |
| 住 | to live; to stay | meaning | "A person settles in and stays — this is home now." |

### Mnemonic invariants

1. **No English answer leakage** — except in anchored stories: anchored
   stories are explicitly required to involve the English meaning.
2. No pinyin leakage in English-to-Hanzi hint profile.
3. No explicit phonetic cue phrases (`think of`, `sounds like`).
4. No literal shape-description filler.
5. No multi-word comma-separated `soundAnchor` values.
6. No "flashes into the scene" boilerplate.
7. **Story must not rely solely on component/radical meanings as the memory
   hook** — sound, shape, or English meaning must carry the story.

## Mnemonic Guardrails

### Goal
Keep mnemonic quality stable as data evolves: concrete visual stories, no leaks,
and anchors integrated safely.

### Ongoing checks

- `node scripts/audit-mnemonics.js --mode all --fail-on-violations` (full vocab + radicals)
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
5. No multi-word comma-separated `soundAnchor` values (single-word ALL CAPS only).
6. No "flashes into the scene" boilerplate.
7. Radical cards require canonical `soundAnchor` + integrated anchor usage in story.

## Coherence Review Workflow

Use this whenever story quality drifts and you need a manual coherence pass.

```bash
# 1. Export all stories with full context
node scripts/export-all-stories.js > work/coherence-review-input.json

# 2. LLM reads every story and flags incoherent ones
#    → save output as work/coherence-review-flags.json

# 3. Inspect flagged cards
node -e "
const d = require('./work/coherence-review-flags.json');
const flagged = d.filter(r => r.flag);
console.log(flagged.length + ' flagged:');
flagged.forEach(r => console.log(r.hanzi, ':', r.reason));
"

# 4. Rewrite the flagged cards
#    Build work/coherence-rewrites.json with { hanzi, rewrittenStory } entries
node scripts/apply-story-rewrites.js --input work/coherence-rewrites.json --dry-run
node scripts/apply-story-rewrites.js --input work/coherence-rewrites.json

# 5. Re-run automated checks
node scripts/audit-mnemonics.js --mode all
node scripts/validate-anchor-stories.js
```

### Helper Scripts

| Script | Purpose |
|--------|---------|
| `scripts/export-all-stories.js` | Export all 178 stories (HSK1 + radicals) for review |
| `scripts/apply-story-rewrites.js --input <file> [--dry-run]` | Apply rewrites from flagged-card rewrite pass |
| `scripts/audit-mnemonics.js --mode all` | Re-run automated checks after rewriting |

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
