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

import { lookupPromo, normalizeCode, type PromoCode } from "./promoCodes";
import { lookupServerPromo } from "./promoAdmin";
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

/**
 * Persisted shape. Built-in (static) codes store only `code` — the effect is
 * re-derived from `promoCodes.ts` on every load. Server (admin-created) codes
 * also store an effect `snapshot` taken at redemption time, so the grant
 * survives offline reloads and is NOT silently revoked if the owner later
 * edits/deactivates the code (editing affects FUTURE redemptions only — normal
 * promo-code semantics).
 */
interface PromoSnapshot {
  discountPercent: number;
  grantedTier: TierId | null;
  label: string;
}
interface StoredPromo {
  code: string;
  snapshot?: PromoSnapshot;
}

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

function fromSnapshot(code: string, snap: PromoSnapshot): PromoState {
  return {
    code,
    discountPercent: snap.discountPercent,
    grantedTier: snap.grantedTier,
    label: snap.label,
  };
}

function snapshotOf(state: PromoState): PromoSnapshot {
  return {
    discountPercent: state.discountPercent,
    grantedTier: state.grantedTier,
    label: state.label ?? "",
  };
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
      const parsed = JSON.parse(raw) as Partial<StoredPromo>;
      if (parsed.code && parsed.snapshot) {
        // Server (admin-created) code — restore the snapshot taken at redeem.
        cached = fromSnapshot(parsed.code, parsed.snapshot);
      } else if (parsed.code) {
        // Built-in code — re-derive from the static source of truth.
        const p = lookupPromo(parsed.code);
        cached = p ? fromPromoCode(p) : EMPTY;
      }
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

async function persist(stored: StoredPromo): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* persistence failure is non-fatal — in-memory copy still active */
  }
}

/**
 * Validate + persist a redemption. Tries the offline built-in codes first
 * (instant, works without a network), then falls back to the server-managed
 * codes the owner created in the admin screen. Returns the resolved effect or
 * invalid.
 */
export async function redeemPromoCode(raw: string): Promise<RedeemResult> {
  // 1. Built-in (static) codes — re-derived from promoCodes.ts on every load.
  const builtIn = lookupPromo(raw);
  if (builtIn) {
    cached = fromPromoCode(builtIn);
    loaded = true;
    await persist({ code: cached.code! });
    notify();
    return { ok: true, state: cached };
  }

  // 2. Server (admin-created) codes — snapshot the effect at redeem time.
  try {
    const result = await lookupServerPromo(normalizeCode(raw));
    if (result.found && result.code) {
      cached =
        result.kind === "grant_tier" && result.tier
          ? { code: result.code, discountPercent: 0, grantedTier: result.tier, label: result.label ?? "" }
          : { code: result.code, discountPercent: result.percent ?? 0, grantedTier: null, label: result.label ?? "" };
      loaded = true;
      await persist({ code: cached.code!, snapshot: snapshotOf(cached) });
      notify();
      return { ok: true, state: cached };
    }
  } catch {
    /* network/server error → treat as not found (generic invalid copy) */
  }
  return { ok: false, reason: "invalid" };
}

/**
 * Admin-only: apply a local tier override for test runs on this device.
 * Reuses the promo-override channel (a synthetic `ADMINTEST` code with a
 * persisted snapshot) so the whole app — gating, paywall, server daily-cap
 * mirror — behaves exactly as it would for a real member of that tier.
 */
export async function applyAdminTierOverride(tier: TierId, tierName: string): Promise<PromoState> {
  cached = {
    code: `ADMINTEST-${tier.toUpperCase()}`,
    discountPercent: 0,
    grantedTier: tier,
    label: `Admin test mode — ${tierName} tier`,
  };
  loaded = true;
  await persist({ code: cached.code!, snapshot: snapshotOf(cached) });
  notify();
  return cached;
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
