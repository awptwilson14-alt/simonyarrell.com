---
name: TV Shows weekly-quota / pool-size invariant
description: Why each category pool in tvShows.ts must be >= its weekly quota, or the top-10 silently degrades.
---

# Weekly rotation needs pool_size >= quota per category

`constants/tvShows.ts` builds the visible weekly list via `weeklyTopShows()`, which
calls `rotatePick(pool, week, quota)` once per `ShowCategory`. The quota is fixed:
3 urban / 1 western / 3 contemporary / 3 formal = top-10.

`rotatePick` has a silent-degrade branch: when `pool.length <= take` it returns the
whole pool *unrotated*. So if any category's pool is smaller than its weekly quota,
that category (a) never rotates and (b) contributes fewer than `quota` shows — the
"top-10" silently becomes a top-9 (or fewer) with a frozen, non-rotating slice.

**The invariant:** every category pool must have **strictly more** shows than its
weekly quota for rotation to actually happen, and **at least** the quota to fill the
slot. Formal launched with only 2 shows vs a quota of 3 → top-9, no formal rotation.
Fixed by growing the pool to 4/2/4/4 (urban/western/contemporary/formal) = 14 shows.

**Why:** the degrade is silent — typecheck passes, screen renders, nothing throws.
Only counting the rendered cards (or the per-category SQL/grep) reveals the gap.

**How to apply:** when changing `WEEKLY_QUOTA` or removing shows from a category,
re-check `count(pool) > quota` for that category. Western is the deliberate exception
(pool 2, quota 1) — it satisfies the invariant and rotates fine.
