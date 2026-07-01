---
name: Look hero image de-duplication
description: Why generated look cards showed duplicate photos and the fallback rule that fixes it
---

Duplicate **images** across generated look cards is a DIFFERENT bug from duplicate look *combinations*. Combos are deduped by fingerprint at generation; hero images are assigned separately from finite editorial pools (`LOOK_IMAGE_POOLS`, a few photos per style×gender).

**Root cause:** `assignUniqueLookImages` (outfitEngine.ts) only dedupes within one rendered grid, and when the small editorial pools collide/exhaust it fell back to repeating an editorial (or the original), so two cards showed the same photo. Regenerating also reused the same ~5 photos per style.

**Fix / rule:** the look's OWN piece product images (`piece.localImage` number or `{uri: piece.imageUrl}`, ordered dress>outerwear>top>bottom>shoes>bag) are appended as a candidate tier AFTER the editorial default pool but BEFORE the cross-gender last-resort scan. Piece images are unique per outfit and already gender-correct (pieces passed `itemMatchesGender` at generation), so pretty editorials still win first-come while piece images guarantee uniqueness once pools exhaust.

**Why:** finite shared editorial pools can never scale to "never duplicate" across many looks + "generate more"; per-outfit imagery is the only structurally-unique source that stays gender-safe.

**How to apply:** never remove the piece-image candidate tier to "restore editorials." If a true 100% guarantee is ever required, the only remaining gap is the rare `!found` total-exhaustion branch that keeps the original — would need a synthetic unique placeholder, which hurts the luxury look, so left as-is.
