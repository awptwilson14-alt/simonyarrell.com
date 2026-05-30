/**
 * Runtime promo-code state, persisted in AsyncStorage.
 *
 * Mirrors the `affiliateSettings.ts` pattern: a single cached snapshot, a
 * boot-time hydration, and a listener set so React can subscribe via
 * `useSyncExternalStore`. Only the normalized code string is persisted — the
 * effect (discount % or granted tier) is always re-derived from
 * `promoCodes.ts`, the single source of truth.
 *
 * `getPromoState()` returns a STABLE reference between changes (required for
 * `useSyncExternalStore` — a fresh object each call would loop forever).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { lookupPromo, type PromoCode } from "./promoCodes";
import type { TierId } from "./tiers";

export interface PromoState {
  /** Normalized redeemed code, or null when none is active. */
  code: string | null;
  /** Percent discount (0 for grant codes / no promo). */
  discountPercent: number;
  /** Tier granted by a comp code, or null. */
  grantedTier: TierId | null;
  /** Human-readable label for the active promo. */
  label: string | null;
}

const EMPTY: PromoState = { code: null, discountPercent: 0, grantedTier: null, label: null };
const STORAGE_KEY = "promoConfig.v1";

let cached: PromoState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* listener errors are isolated */
    }
  }
}

function fromPromoCode(p: PromoCode): PromoState {
  if (p.effect.kind === "percent_off") {
    return { code: p.code, discountPercent: p.effect.percent, grantedTier: null, label: p.label };
  }
  return { code: p.code, discountPercent: 0, grantedTier: p.effect.tier, label: p.label };
}

/**
 * Hydrate from AsyncStorage on boot. Idempotent. Re-derives the effect from
 * the current `PROMO_CODES` list so code definitions can evolve without
 * stranding old redemptions on stale effects.
 */
export async function loadPromoConfig(): Promise<PromoState> {
  if (loaded) return cached;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { code?: string };
      const p = parsed.code ? lookupPromo(parsed.code) : null;
      cached = p ? fromPromoCode(p) : EMPTY;
    }
  } catch {
    /* corrupt storage → leave defaults */
  }
  loaded = true;
  notify();
  return cached;
}

export function isPromoLoaded(): boolean {
  return loaded;
}

/** Stable snapshot for `useSyncExternalStore`. */
export function getPromoState(): PromoState {
  return cached;
}

export type RedeemResult =
  | { ok: true; state: PromoState }
  | { ok: false; reason: "invalid" };

/** Validate + persist a redemption. Returns the resolved effect or invalid. */
export async function redeemPromoCode(raw: string): Promise<RedeemResult> {
  const p = lookupPromo(raw);
  if (!p) return { ok: false, reason: "invalid" };
  cached = fromPromoCode(p);
  loaded = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ code: cached.code }));
  } catch {
    /* persistence failure is non-fatal — in-memory copy still active */
  }
  notify();
  return { ok: true, state: cached };
}

/** Remove any active promo (reverts to no discount / no grant). */
export async function clearPromoCode(): Promise<void> {
  cached = EMPTY;
  loaded = true;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-fatal */
  }
  notify();
}

export function subscribePromo(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
