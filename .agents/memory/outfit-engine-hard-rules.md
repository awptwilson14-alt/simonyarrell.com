---
name: Outfit engine hard rules — gender + no-duplicate
description: The two non-negotiable invariants of the Maison Simon outfit engine and where every generation path must enforce them.
---

# Two hard rules the outfit engine must always honor

## Rule 1 — ZERO gender leakage
A selected gender must NEVER receive an opposite-gender item.

**The trap:** feed items are multi-tagged. Many are `["men","unisex"]` or
`["women","unisex"]`. A naive `item.genders.includes("unisex")` wildcard treats
those as unisex and leaks men's items into women's looks (and vice versa).

**The rule (single source of truth):** an item is eligible for a chosen gender
only when it explicitly carries THAT gender tag, OR it is *purely* unisex
(tagged `unisex` with no opposite-gender tag). A `unisex` PROFILE sees all.
This lives in one helper in `outfitEngine.ts`; every gender-filtered pool
(brand-availability, main pool, brand-lock pool, ultra-fallback pool, AI pool)
routes through it. Never reintroduce a bare `.includes("unisex")` gender filter.

**Why:** `["men","unisex"]` means "a men's item that also reads unisex-ish", not
"show to everyone". The user's rule is absolute — no opposite-gender pieces ever.

## Rule 2 — NO duplicate looks, EVER (across sessions)
Once a look combination (fingerprint = sorted piece ids) has been generated it
must never regenerate — not on regenerate, not in a later session. The ONLY way
a combo is retained is by the user SAVING it (Saved is a separate store).

**How to apply:** ALL generation paths must dedup, not just the main one. The
brand-lock fallback, ultra-fallback, and AI path each compute a fingerprint and
must gate on it (`isShown` → skip/return null; `markShown` on emit). A single
in-memory `Set` is not enough — it is mirrored to persistent storage
(`lib/shownLooks.ts`, AsyncStorage) so the ban survives restarts.

**Three durability requirements (all easy to regress):**
1. **Hydration race:** persistence load is async. Every generation entry point
   (`generate`, `generateWithAI` in style.tsx; `onGenerate` in runway.tsx) must
   `await whenShownLooksReady()` before producing a look, or a pre-hydration
   look can duplicate a prior session. The readiness promise must resolve even
   on load failure (resolve in `finally`) so generation is never blocked forever.
2. **Abrupt kill:** the persist write is debounced. Flush immediately on
   AppState `background`/`inactive` and on web `pagehide`/`beforeunload`, else
   recently-generated fingerprints are lost on a hard close.
3. **Storage cap is a SAFETY valve, not a feature:** on web AsyncStorage is
   localStorage (~5MB); unbounded growth would eventually throw QuotaExceeded
   and silently stop persisting everything. The cap drops OLDEST fingerprints —
   accept that a handful of oldest combos can theoretically recur, because a
   finite catalog bounds real growth long before the cap and losing all
   persistence is a far worse failure. Do NOT remove the cap.

**Do NOT** clear the shown-fingerprint set anywhere (old code cleared it on
mount, on Reset, and in dedup-recovery — all removed). Clearing it re-enables
duplicates, which is the exact bug. Dedup-recovery re-runs the pass WITHOUT
clearing; if the pool is genuinely exhausted, an empty grid is the intended
honest empty-state, consistent with the app's finite-catalog philosophy.
