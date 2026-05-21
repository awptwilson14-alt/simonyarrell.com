import { CELEBS, type CelebFull } from "@/constants/celebrities";

/**
 * Centralized celeb-resolution helpers.
 *
 * Every surface that links saved items, generated looks, or editorial chips
 * back to a celeb resolves through these two functions. Keeping the lookup
 * here ensures the attribution contract is single-sourced:
 *   - by-name uses `c.name === name` (matches `inspiredBy` keys saved by
 *     the engine and threaded through batches 22, 24, 25, 28, 32, 33, 34, 35)
 *   - by-id uses `c.id === id` (matches `/celebrity/[id]` route params and
 *     the celebrity selection on the style screen)
 *
 * Both accept undefined defensively so callers can pass optional props
 * directly without inline guards. Both return `undefined` when the name/id
 * doesn't resolve (renamed or removed icons) — callers fall back to neutral
 * styling rather than crashing.
 */
export function findCelebByName(name: string | null | undefined): CelebFull | undefined {
  if (!name) return undefined;
  return CELEBS.find((c) => c.name === name);
}

export function findCelebById(id: string | null | undefined): CelebFull | undefined {
  if (!id) return undefined;
  return CELEBS.find((c) => c.id === id);
}
