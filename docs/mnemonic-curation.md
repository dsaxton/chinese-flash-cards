# Mnemonic Curation Guide

## Design principles

### CRITICAL: What a story may rely on

A mnemonic story is only useful if the learner can activate it from what they
already know at the moment they see the card. The only things a learner
reliably has access to are:

1. **The sound of the word** — via the phonetic anchor (ALL CAPS English word
   that approximates the Chinese pronunciation)
2. **The visual shape of the character** — what it looks like on screen
3. **The English meaning** — the answer they are trying to recall or remember

**Every story must be grounded in one or more of these three things.**

Stories must **not** rely primarily on radical or component meanings as the
memory hook. A learner seeing 住 does not necessarily know that 亻 means
"person" or that 主 means "master/owner." A story built on those component
meanings ("a lone figure meets a master near the gate") is useless to anyone
who has not already memorized those radicals — which describes most HSK1
learners.

Component meanings may appear as supporting color once the story already works
on its own, but they must never be the primary hook.

### The three valid hooks

| Hook | When to use | How |
|------|------------|-----|
| **Sound** | Card has a `soundAnchor` | Anchor word in ALL CAPS, placed early in the sentence, causally linked to the meaning |
| **Shape** | Character has a distinctive, iconic visual form | Describe what it looks like; works best for simple characters (人, 口, 日, 大, 山, 木) |
| **Meaning** | Always | State or evoke the English meaning in the scene. Required for anchored stories; evoked (not stated outright) for unanchored stories |

### Anchored stories: linking sound to meaning

The phonetic keyword method works as a two-link chain:

```
Chinese sound  →  anchor word  →  English meaning
    (bù)           (BOO)            (not / no)
```

Both links must exist in the story. If the anchor appears but the meaning does
not, the second link is broken and the mnemonic does nothing.

**Good:**
> "The crowd BOOs — NO, they will not allow it."
> *(BOO → refusal → not/no)*

**Bad (second link missing):**
> "BOO! A bird hits an invisible ceiling."
> *(BOO appears but the story says nothing about "not" or "no")*

### Unanchored stories: evoke the meaning without stating it

For cards without a sound anchor, the story should evoke the English meaning
strongly enough that a learner could infer the territory — but without stating
the answer word directly (which would make the card too easy).

**Good (evokes without stating):**
> "A person settles in and decides not to leave." *(for 住 "to live; to stay")*

**Bad (states the answer):**
> "A person stays and lives here." *(leaks "stay" and "live")*

**Bad (component-only, no meaning hook):**
> "A lone figure meets a master near the old gate." *(requires knowing 亻 and 主)*

---

## Story quality rules

Apply to every story. A story that fails any rule should be rewritten or
cleared (empty is better than broken).

1. **Coherent English sentence** — reads as natural English a native speaker
   would understand without context.
2. **Single, concrete, pictureable scene** — the listener should be able to
   close their eyes and see exactly who is doing what. Reject abstract
   constructions ("the concept of", "the energy of").
3. **Grounded in sound, shape, or meaning** — must not rely solely on
   component/radical definitions. Works for a learner who does not know the
   radical meanings.
4. **≤ 12 words** — shorter is more memorable.
5. **No English answer leakage** — *except* in anchored stories, where the
   meaning is required.
6. **No pinyin in story text** (English-to-Hanzi direction).
7. **No explicit phonetic cue phrases** — no "Think of", "sounds like",
   "rhymes with".
8. **No "flashes into the scene" boilerplate.**
9. **No literal shape-description filler** — "this component appears in
   characters related to X" is not a mnemonic.
10. **No multi-word `soundAnchor`** — anchors must be canonical single-word
    format: `Think of WORD.`

---

## Structured data format

```js
mnemonicData: {
  soundAnchor: "Think of CHEW.",   // "Think of WORD." — single uppercase English word
  story: "To eat well, you must CHEW every bite slowly.",
  components: [{ hanzi: "口", meaning: "mouth" }],  // supporting context only
}
```

- If `soundAnchor` is empty, the story should evoke the meaning without
  stating it.
- If a card cannot meet all quality rules, leave `story: ""` — no story
  is shown rather than a bad one.

---

## Tooling

### Audit and validate

```bash
node scripts/audit-mnemonics.js --mode all --fail-on-violations   # full vocab + radicals quality gate
node scripts/validate-anchor-stories.js             # anchor integration coverage
node scripts/test-mnemonic-curation.js              # includes single-char HSK1 sound-anchor coverage >= 95%
```

Note: coherence / concreteness / component-only checks are implemented as
heuristics in scripts, not as full semantic understanding.

### Review and rewrite workflow

```bash
# Export all stories for LLM coherence review
node scripts/export-all-stories.js > work/coherence-review-input.json

# Export specific problem categories
node scripts/export-problem-stories.js > work/phase1-input.json   # broken / leakers / context-desc / multi-anchor
node scripts/export-missing-stories.js > work/phase2-input.json   # cards with no story
node scripts/export-anchor-stories.js --needs-rewrite > work/phase3-input.json  # anchored, not yet integrated

# Apply LLM-generated rewrites (works for both vocab and radical cards)
node scripts/apply-story-rewrites.js --input work/output.json --dry-run
node scripts/apply-story-rewrites.js --input work/output.json
```

### Build seed / phonetic hint data

```bash
node scripts/build-mnemonic-seeds.js \
  --makemeahanzi /path/to/dictionary.txt \
  --out data/mnemonic-seeds/hsk1-seeds.json

node scripts/build-phonetic-hints.js \
  --makemeahanzi /path/to/dictionary.txt \
  --unihan /path/to/Unihan_Readings.txt \
  --cedict /path/to/cedict_ts.u8 \
  --out data/mnemonic-seeds/hsk1-phonetic-hints.json
```
