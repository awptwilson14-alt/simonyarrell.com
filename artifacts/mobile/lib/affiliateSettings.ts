/**
 * Runtime-overridable affiliate configuration.
 *
 * The base `applyAffiliate()` in `./affiliate.ts` reads env vars at module
 * load. This module layers a runtime override on top so the user can flip
 * the affiliate system on/off and switch networks from inside the app —
 * without an app restart or env redeploy.
 *
 * Precedence (highest first):
 *   1. Runtime override (this module, persisted in AsyncStorage)
 *   2. Env vars (`EXPO_PUBLIC_AFFILIATE_NETWORK` + `EXPO_PUBLIC_AFFILIATE_ID`)
 *   3. Disabled (no-op pass-through)
 *
 * The override is OFF by default — the user explicitly turns it on from the
 * Affiliate Settings screen when they're ready to start earning commission.
 * Until then the catalog continues to ship raw brand URLs.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AFFILIATE_NETWORKS = [
  "skimlinks",
  "rakuten",
  "impact",
  "awin",
  "cj",
  "ltk",
  "shareasale",
  "generic",
] as const;
export type AffiliateNetwork = (typeof AFFILIATE_NETWORKS)[number];

export interface AffiliateConfig {
  /** Master kill switch. When false, applyAffiliate is a no-op even if id+network are set. */
  enabled: boolean;
  network: AffiliateNetwork | null;
  publisherId: string;
}

const STORAGE_KEY = "affiliateConfig.v1";

let cached: AffiliateConfig = { enabled: false, network: null, publisherId: "" };
let loaded = false;
/**
 * True once the user has explicitly saved any state via the settings UI.
 * Once true, the runtime override is AUTHORITATIVE — env vars are ignored,
 * even when the toggle is OFF. This is what makes the in-app switch a real
 * master switch (architect feedback). Until the user has saved anything,
 * env vars remain a valid fallback for legacy deployments.
 */
let hasStoredOverride = false;
const listeners = new Set<() => void>();

/**
 * Hydrate from AsyncStorage on app boot. Idempotent — safe to call from
 * multiple places (e.g. AppContext on mount + lazy on first applyAffiliate
 * call). Resolves quickly on web (synchronous-ish localStorage backend) and
 * within a tick on native.
 */
export async function loadAffiliateConfig(): Promise<AffiliateConfig> {
  if (loaded) return cached;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AffiliateConfig>;
      cached = {
        enabled: Boolean(parsed.enabled),
        network: (AFFILIATE_NETWORKS as readonly string[]).includes(parsed.network ?? "")
          ? (parsed.network as AffiliateNetwork)
          : null,
        publisherId: typeof parsed.publisherId === "string" ? parsed.publisherId.trim() : "",
      };
      hasStoredOverride = true;
    }
  } catch {
    /* corrupt storage → leave defaults */
  }
  loaded = true;
  return cached;
}

/** True once the AsyncStorage hydration attempt has completed (success or empty). */
export function isAffiliateConfigLoaded(): boolean {
  return loaded;
}

/**
 * True once the user has explicitly saved any settings via the UI. Used by
 * the `applyAffiliate` resolver to decide whether env vars are still a
 * valid fallback (no stored override yet) or whether the runtime config is
 * the only source of truth (override exists — respect user intent, even
 * when they have switched it OFF).
 */
export function hasUserAffiliateOverride(): boolean {
  return hasStoredOverride;
}

/** Synchronous read of the last-hydrated config. Returns defaults until `loadAffiliateConfig` has resolved at least once. */
export function getAffiliateConfig(): AffiliateConfig {
  return cached;
}

export async function setAffiliateConfig(next: AffiliateConfig): Promise<void> {
  cached = {
    enabled: Boolean(next.enabled),
    network: next.network,
    publisherId: (next.publisherId || "").trim(),
  };
  loaded = true;
  hasStoredOverride = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* persistence failure is non-fatal — in-memory copy still active for the session */
  }
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* listener errors are isolated */
    }
  }
}

export function subscribeAffiliateConfig(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Effective runtime override. Returns the live config only when:
 *   - the user has toggled it ON, AND
 *   - a network is selected, AND
 *   - a publisher ID is present.
 * Otherwise returns null — but see `hasUserAffiliateOverride()` for the
 * env-fallback gate: even a null here can legitimately mean "user has
 * explicitly disabled — do NOT fall back to env vars".
 */
export function effectiveRuntimeConfig(): { network: AffiliateNetwork; publisherId: string } | null {
  if (!cached.enabled) return null;
  if (!cached.network) return null;
  if (!cached.publisherId) return null;
  return { network: cached.network, publisherId: cached.publisherId };
}
