# Investigation: Multiple Phonetic Hints for Multi-Syllable Pinyin

## Summary

This document investigates adding more than one phonetic hint (sound anchor) to mnemonic stories when a card's pinyin has multiple syllables. For example, 电脑 (diànnǎo) would use two anchor words—one for 电 (diàn) and one for 脑 (nǎo)—instead of a single anchor that approximates only the first syllable.

---

## Current State

### How It Works Today

1. **Single-word anchors only**: All deck entries use `soundAnchor: "Think of WORD."` with exactly one English word, per `docs/mnemonic-curation.md` rule 10.

2. **Multi-syllable words use one anchor**: Cards like 爸爸 (bàba), 杯子 (bēizi), 电脑 (diànnǎo), 好吃 (hǎochī) use a single anchor that either:
   - Approximates the whole word (e.g. PAPA for bàba)
   - Or covers only the first syllable (e.g. BAY for bēizi, DEAN for diànnǎo)

3. **index.html already supports multi-word anchors**: The runtime code in `index.html` has:
   - `getSoundAnchor(card)` — maps each pinyin syllable to an anchor via `pinyinToAudioKeys()` + `PHONETIC_ANCHOR_CANDIDATES`, and builds `"Think of WORD1, WORD2."` when there are multiple syllables
   - `buildIntelligibleAnchorPhrase(words)` — returns `Think of ${words.join(", ")}.` for multiple words
   - `mergeSoundAnchorAndStory()` — checks that **all** anchor words appear in the story before skipping prepending

4. **Validation and tests enforce single-word only**:
   - `mnemonic-quality-lib.js::extractCanonicalAnchorWord()` — regex `/^Think of ([A-Z]+)\.$/` matches only one word; multi-word anchors return `""`
   - `test-mnemonic-curation.js::assertCanonicalSoundAnchor()` — asserts `/^Think of [A-Z]+\.$/` (single word)
   - `validate-anchor-stories.js` — uses `extractCanonicalAnchorWord`, so multi-word anchors are treated as malformed
   - `storyTextExcludingAnchor()` — strips only one word when checking for pinyin leakage

---

## What Would Need to Change

### 1. Canonical Format

**Current**: `Think of WORD.`  
**Proposed**: `Think of WORD1, WORD2.` (comma-separated for multi-syllable)

The format is already used by `index.html`; we would formalize it and update validation.

### 2. mnemonic-quality-lib.js

| Function | Current Behavior | Required Change |
|----------|------------------|-----------------|
| `extractCanonicalAnchorWord` | Returns single word or `""` | Add `extractCanonicalAnchorWords(soundAnchor)` returning `string[]` for all words |
| `anchorFormsForStory` | Uses single word + aliases | Accept multiple words; return combined forms for each |
| `anchorIntegratedInStoryWithAliases` | Checks one word | Check that **all** words (or aliases) appear in story |
| `storyTextExcludingAnchor` | Strips one word | Strip all anchor words when checking pinyin leakage |
| `isAnchorGrammaticallyIsolated` | Uses single word | May need to consider first word only, or all |

### 3. validate-anchor-stories.js

- Use `extractCanonicalAnchorWords` (or similar) to support multi-word anchors
- Update malformed-anchor detection to accept `Think of WORD1, WORD2.` format

### 4. test-mnemonic-curation.js

- Relax `assertCanonicalSoundAnchor` to allow `Think of WORD1, WORD2, ...` (comma-separated words)
- Ensure tests for anchor-in-story integration work with multiple words

### 5. docs/mnemonic-curation.md

- **Rule 10**: Change from "No multi-word soundAnchor" to "Multi-syllable words use comma-separated anchors: Think of WORD1, WORD2."
- Add guidance: each syllable maps to one anchor; story must integrate all anchor words naturally

### 6. phonetic-config.json

- Ensure every common syllable has a valid `englishSoundAnchorWords` entry
- Gaps today: e.g. `zi` → "dzuh" (DZUH may not be in whitelist); `nao` may need a candidate

### 7. Deck Data (deck-data.json)

- Multi-syllable cards would need `soundAnchor` updated from single-word to multi-word
- Example: 电脑 `"Think of DEAN."` → `"Think of DEAN, NOW."` (if "now" approximates 脑)
- Stories would need to be rewritten to include both anchor words

---

## Implementation Considerations

### Pros of Multi-Syllable Hints

- **Better phonetic coverage**: Each syllable gets its own mnemonic hook
- **Clearer recall path**: 电脑 → DEAN + NOW is more precise than DEAN alone
- **Consistency**: Single-syllable and multi-syllable cards follow the same pattern (one anchor per syllable)

### Challenges

1. **Story quality**: Fitting two (or more) anchor words into a short, natural sentence is harder than one
2. **Syllable coverage**: Some syllables (e.g. 子 zi, 脑 nǎo) may lack good English approximations in `englishSoundAnchorWords`
3. **Migration**: Existing multi-syllable cards have single-word anchors; stories would need review/rewrite
4. **Validation complexity**: `anchorIntegratedInStoryWithAliases` must require all words, not just one

### Suggested Phased Approach

1. **Phase 1**: Extend lib/validation/tests to support multi-word anchors without breaking single-word
2. **Phase 2**: Add missing syllable→anchor mappings to `phonetic-config.json` where needed
3. **Phase 3**: Migrate a small set of multi-syllable cards (e.g. 5–10) as a pilot
4. **Phase 4**: Evaluate story quality and iterate before broader rollout

---

## Files to Modify

| File | Changes |
|------|---------|
| `scripts/mnemonic-quality-lib.js` | `extractCanonicalAnchorWords`, update `anchorFormsForStory`, `anchorIntegratedInStoryWithAliases`, `storyTextExcludingAnchor` |
| `scripts/validate-anchor-stories.js` | Support multi-word format |
| `scripts/test-mnemonic-curation.js` | Relax `assertCanonicalSoundAnchor` |
| `scripts/audit-mnemonics.js` | Use multi-word-aware helpers if it checks anchors |
| `docs/mnemonic-curation.md` | Update rule 10, add multi-syllable guidance |
| `data/phonetic-config.json` | Add/fix syllable mappings (e.g. nao, zi) |
| `data/deck-data.json` | Per-card migration when ready |

---

## Example: 电脑 (diànnǎo) "computer"

**Current**:
```json
"soundAnchor": "Think of DEAN.",
"story": "DEAN boots up the old computer and the screen glows."
```

**Proposed (multi-syllable)**:
```json
"soundAnchor": "Think of DEAN, NOW.",
"story": "DEAN boots up the computer NOW — the screen glows instantly."
```

Both DEAN (电 diàn) and NOW (脑 nǎo) would need to be in `englishSoundAnchorWords` and map from the phonetic config. The story integrates both anchors while preserving meaning.
