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
| **Sound** | Card has a `soundAnchor` | Anchor word in ALL CAPS, placed wherever the sentence is most natural, causally linked to the meaning |
| **Shape** | Character has a distinctive, iconic visual form | Describe what it looks like; works best for simple characters (人, 口, 日, 大, 山, 木) |
| **Meaning** | Always | State or evoke the English meaning in the scene. Required for anchored stories; evoked (not stated outright) for unanchored stories |

### Sound anchor selection

A sound anchor word must closely approximate the Chinese syllable(s) when
spoken aloud. That is its only hard requirement.

**Dual proximity is a property of the story, not the anchor.** An ideal anchor
happens to have a natural semantic bridge to the meaning (e.g. CHAI → tea,
BOO → not), but many valid anchors have no inherent connection (e.g. SHOE for
书 "book"). The *story* is responsible for building a vivid, concrete scene
that links the anchor sound to the English meaning — even when the two are
semantically distant. A good story can bridge any gap; a bad story fails even
with a perfect dual-fit anchor.

| Anchor | Hanzi | English | Notes |
|--------|-------|---------|-------|
| CHAI | 茶 chá | tea | Natural overlap — story writes itself |
| BOO | 不 bù | not; no | Boo evokes rejection — easy bridge |
| CHEW | 吃 chī | to eat | Chewing is eating — easy bridge |
| SHOE | 书 shū | book | No inherent link — story must build the bridge (e.g. "A SHOE props the bookcase door open.") |

If forcing the exact anchor token makes the sentence unnatural, the story may
use a natural English alias/fragment listed in
`data/phonetic-config.json::phoneticAnchorAliases` (for example, anchor `GIN`
integrated via `begins` / `forging`).

---

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
6. **No pinyin in story text** (English-to-Hanzi direction). The anchor word
   itself is excluded from this check — when the best English approximation
   happens to match the romanized pinyin (e.g. DONG for dǒng, SONG for sòng),
   that is a feature of a good phonetic match, not a leak.
7. **No explicit phonetic cue phrases** — no "Think of", "sounds like",
   "rhymes with".
8. **No "flashes into the scene" boilerplate.**
9. **No literal shape-description filler** — "this component appears in
   characters related to X" is not a mnemonic.
10. **No multi-word `soundAnchor`** — anchors must be canonical single-word
    format: `Think of WORD.`
11. **No meta-template language** — the story must paint a scene, not narrate
    the mnemonic system. Phrases like "I recall X when Y appears", "the cue
    leads me to", "becomes obvious once", "stays linked to", "I map X to Y",
    and similar self-referential wording are forbidden. If the story describes
    the act of remembering instead of creating a memorable image, it provides
    no recall benefit over rote memorization.
12. **Anchor must fill a grammatical slot** — the ALL-CAPS anchor word must
    function as a real part of speech in the sentence (adverb, noun, verb,
    interjection, etc.). Jamming the anchor before a noun with no connector
    ("WORE sparks leap", "SHE steam rises") is forbidden. Valid patterns
    include: natural adverb ("TOO much rain…"), interjection with comma
    ("HUH, ripe stalks…"), imperative verb + object ("SHOW me your grip…"),
    or mid-sentence placement ("She WORE ash-dusted gloves…").
13. **Template diversity required** — avoid repeated sentence scaffolds across cards.
14. **Anchor placement diversity required** — anchored stories should not mostly begin with the anchor token.
    Radical stories are held to a stricter cap (≤ 50% anchor-first).
15. **Shared-anchor distinctness** — when two cards share the same anchor word,
    their stories must be meaningfully distinct (low word overlap).

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
node scripts/validate-anchor-stories.js             # anchor integration coverage (HSK1 + radicals)
node scripts/test-mnemonic-curation.js              # includes coverage, template-diversity, and anchor-placement-diversity gates
node scripts/test-hint-safety.js                    # hint profile safety checks (no pinyin/answer leakage)
```

Note: coherence / concreteness / component-only checks are implemented as
heuristics in scripts, not as full semantic understanding.

### Relevance scoring

Score every story for meaning-relevance and surface the worst candidates for
rewrite:

```bash
# Score all stories (includes empty) — lowest-scoring first
node scripts/score-story-relevance.js

# Score non-empty stories only (skip empties); cap output rows
node scripts/score-story-relevance.js --non-empty --limit 20

# Write results to a custom path
node scripts/score-story-relevance.js --non-empty --out work/relevance.json
```

The scorer assigns 0–100 per story. Key penalty flags:

| Flag | Points lost | Meaning |
|------|-------------|---------|
| `meta_template` | −40 | Story narrates the mnemonic system instead of painting a scene |
| `anchor_not_integrated` | −35 | Anchor word absent from story |
| `anchor_isolated` | −30 | Anchor jammed before a noun with no grammatical connector |
| `incoherent` | −30 | Story fails basic coherence checks |
| `anchored_no_meaning_hit` | −25 | Anchored story has no meaning cue |
| `abstract` | −20 | Story uses abstract meta-language |
| `unanchored_no_meaning_hit` | −18 | Unanchored story has no meaning cue |
| `anchor_meaning_split` | −12 | Anchor and meaning are in different `;`-clauses |

Use the output JSON as input for an LLM coherence pass on the bottom tier.

### Relevance rewrite workflow (agent handoff)

Use this when you want an LLM agent to rewrite low-scoring stories.

**Step 1 — generate the ranked list**

```bash
node scripts/score-story-relevance.js --non-empty --out work/relevance.json
```

**Step 2 — hand off to the agent**

Give the agent `work/relevance.json` and the following prompt:

> You are rewriting mnemonic stories for a Chinese flash card app.
> Each entry in the JSON has: `hanzi`, `pinyin`, `english`, `soundAnchor`,
> `story`, `score`, and `reasons`.
>
> For each entry with `score < 100`, rewrite the `story` so that it:
>
> 1. If `soundAnchor` is non-empty (e.g. `"Think of BOO."`): naturally includes
>    the anchor word in ALL CAPS somewhere in the sentence, and the scene must
>    directly involve or cause something related to the English meaning.
>    Both the sound hook and the meaning hook must appear in the same clause —
>    do not separate them with a semicolon.
> 2. If `soundAnchor` is empty: evokes the English meaning strongly enough
>    that a reader could infer the concept — but does not state the answer
>    word directly.
> 3. Is a single, concrete, pictureable scene (≤ 12 words).
> 4. Uses natural English with no Chinese characters, no pinyin, no
>    "Think of", "sounds like", "flashes into the scene", and no
>    meta-template language that narrates the mnemonic system (e.g.
>    "I recall", "the cue", "comes to mind", "becomes obvious").
>
> `reasons` tells you what is wrong with the current story:
> - `meta_template` — the story narrates the mnemonic system ("I recall X when Y appears") instead of painting a scene; rewrite as a vivid, concrete image
> - `anchor_not_integrated` — the anchor word does not appear in the story at all
> - `anchored_no_meaning_hit` — the story has no word or synonym related to the English meaning
> - `anchor_meaning_split` — the anchor and the meaning are in different clauses (separated by `;`)
> - `unanchored_no_meaning_hit` — no meaning cue present; evoke the concept more directly
> - `abstract` — replace abstract meta-language with a concrete scene
> - `incoherent` — fix grammar/structure
>
> For grammar/discourse particles (e.g. 得, 正在, 了, 的, 吗) where the
> English meaning is a grammatical label, write a scene that demonstrates the
> *function* of the word rather than naming it. If no plausible scene exists,
> output `"rewrittenStory": ""` — an empty story is shown as nothing rather
> than as a bad mnemonic.
>
> **Dual proximity lives in the story, not the anchor.** Even when the
> anchor word has no inherent semantic connection to the English meaning
> (e.g. SHOE for "book"), write a scene that bridges the two through
> concrete action or imagery. Only flag an `"anchorNote"` if you genuinely
> cannot construct a natural scene linking the anchor to the meaning.
>
> Output a JSON array:
> ```json
> [
>   { "hanzi": "来", "rewrittenStory": "LIE detector beeps — come clean now." },
>   { "hanzi": "会", "rewrittenStory": "WAY she lifts it — now she can." },
>   ...
> ]
> ```
> Only include entries you are rewriting (score < 100). Skip entries that
> already score 100.

**Step 3 — apply and validate**

```bash
node scripts/apply-story-rewrites.js --input work/relevance-rewrites.json --dry-run
node scripts/apply-story-rewrites.js --input work/relevance-rewrites.json
node scripts/audit-mnemonics.js --mode all
node scripts/score-story-relevance.js --non-empty --limit 20
```

### Review and rewrite workflow

```bash
# Export all stories for LLM coherence review
node scripts/export-all-stories.js > work/coherence-review-input.json

# Score stories by meaning-relevance and surface the worst candidates
node scripts/score-story-relevance.js --non-empty --out work/relevance.json

# Export specific problem categories
node scripts/export-problem-stories.js > work/phase1-input.json   # broken / leakers / context-desc / multi-anchor
node scripts/export-missing-stories.js > work/phase2-input.json   # cards with no story
node scripts/export-anchor-stories.js --needs-rewrite > work/phase3-input.json  # anchored, not yet integrated

# Inspect LLM-flagged cards
node -e "
const d = require('./work/coherence-review-flags.json');
const flagged = d.filter(r => r.flag);
console.log(flagged.length + ' flagged:');
flagged.forEach(r => console.log(r.hanzi, ':', r.reason));
"

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
