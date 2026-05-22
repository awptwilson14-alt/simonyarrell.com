/**
 * Affiliate URL tagging.
 *
 * Every BUY-tap URL flows through `applyAffiliate(url)` at the moment of
 * navigation (NOT at catalog/engine construction time — see the architecture
 * note below). The moment the user signs up to an affiliate network we earn
 * commission on every tap without touching the catalog or the engine.
 *
 * Configuration is two-layer:
 *   1. RUNTIME override from `./affiliateSettings.ts` (in-app toggle UI,
 *      persisted in AsyncStorage, takes precedence when enabled).
 *   2. Env vars — `EXPO_PUBLIC_AFFILIATE_NETWORK` + `EXPO_PUBLIC_AFFILIATE_ID`
 *      (build-time fallback for server-side / no-UI deployments).
 *
 * Supported networks: skimlinks, rakuten, impact, awin, cj, ltk, shareasale,
 * generic. When neither layer is configured (or the runtime kill-switch is
 * OFF), `applyAffiliate` is a no-op and returns the original URL unchanged.
 *
 * ── Architecture: WRAP AT CLICK TIME ONLY ────────────────────────────────
 * The engine stores RAW destination URLs on every OutfitPiece. We wrap
 * once, at the consumer (Linking.openURL call sites), so:
 *   - Saved products persist the raw URL (future-proof if the user changes
 *     networks or we want to switch the redirector format).
 *   - There is no possibility of double-wrapping by accident — the engine
 *     simply never wraps.
 *   - Idempotency below is still defensive for ad-hoc callers that might
 *     pass an already-wrapped URL.
 */

import {
  effectiveRuntimeConfig,
  hasUserAffiliateOverride,
  isAffiliateConfigLoaded,
  type AffiliateNetwork,
} from "./affiliateSettings";

const ALLOWED_NETWORKS = [
  "skimlinks",
  "rakuten",
  "impact",
  "awin",
  "cj",
  "ltk",
  "shareasale",
  "generic",
] as const;
type Network = (typeof ALLOWED_NETWORKS)[number];

const RAW_NETWORK = (process.env.EXPO_PUBLIC_AFFILIATE_NETWORK ?? "")
  .toLowerCase()
  .trim();
const ENV_NETWORK: Network | "" = (ALLOWED_NETWORKS as readonly string[]).includes(RAW_NETWORK)
  ? (RAW_NETWORK as Network)
  : "";
const ENV_PUBLISHER_ID = (process.env.EXPO_PUBLIC_AFFILIATE_ID ?? "").trim();

const isValidHttp = (u: string): boolean => /^https?:\/\//i.test(u);

interface ActiveConfig {
  network: Network;
  publisherId: string;
}

/**
 * Resolve the active affiliate config at call time. Precedence:
 *
 *   1. NOT yet hydrated → no-op (null). Returning early is what closes
 *      the architect-flagged hydration race: a first-tick BUY tap that
 *      fires before `loadAffiliateConfig()` resolves cannot accidentally
 *      get tagged with the env-var network when the user has stored a
 *      different (or OFF) preference.
 *
 *   2. User HAS stored an override (toggled at least once) → runtime config
 *      is AUTHORITATIVE. Env vars are ignored, even when the runtime
 *      toggle is OFF. This is what makes the in-app switch a real master
 *      kill-switch (architect feedback).
 *
 *   3. No stored override yet → env vars are the legacy fallback for
 *      deployments that pre-date this UI.
 */
function activeConfig(): ActiveConfig | null {
  if (!isAffiliateConfigLoaded()) return null;
  if (hasUserAffiliateOverride()) {
    const runtime = effectiveRuntimeConfig();
    return runtime ? { network: runtime.network as Network, publisherId: runtime.publisherId } : null;
  }
  if (ENV_NETWORK && ENV_PUBLISHER_ID) {
    return { network: ENV_NETWORK, publisherId: ENV_PUBLISHER_ID };
  }
  return null;
}

/**
 * Wrap a destination URL with the configured affiliate redirector. Returns
 * the original URL unchanged when not configured, when the input is not a
 * valid http(s) URL, or when the URL is already tagged for the active
 * network.
 */
export function applyAffiliate(url: string): string {
  if (!url || !isValidHttp(url)) return url;
  const cfg = activeConfig();
  if (!cfg) return url;
  const { network, publisherId } = cfg;
  try {
    switch (network) {
      case "skimlinks": {
        if (url.includes("go.skimresources.com")) return url;
        return `https://go.skimresources.com/?id=${encodeURIComponent(publisherId)}&xs=1&url=${encodeURIComponent(url)}`;
      }
      case "awin": {
        if (url.includes("awin1.com")) return url;
        return setQueryParam(url, "awc", publisherId);
      }
      case "rakuten": {
        if (url.includes("click.linksynergy.com")) return url;
        return setQueryParam(url, "u1", publisherId);
      }
      case "impact": {
        if (/\bpxf\.io\b/.test(url)) return url;
        return setQueryParam(url, "irclickid", publisherId);
      }
      case "cj": {
        // CJ Affiliate (Commission Junction). Standard deep-link tagging
        // adds `sid` for sub-affiliate tracking; full PID-based redirector
        // links (anrdoezrs.net) can be configured per-advertiser in CJ's
        // dashboard and pasted into the catalog if needed.
        if (url.includes("anrdoezrs.net") || url.includes("dpbolvw.net")) return url;
        return setQueryParam(url, "sid", publisherId);
      }
      case "ltk": {
        // LTK (LiketoKnow.it) uses `subid` for creator/publisher attribution
        // on direct retailer links. Native LTK shortlinks (shopltk.com)
        // remain untouched.
        if (url.includes("shopltk.com") || url.includes("liketk.it")) return url;
        return setQueryParam(url, "subid", publisherId);
      }
      case "shareasale": {
        // ShareASale uses `afftrack` for publisher sub-id tracking on
        // merchant links; merchant-specific shareasale.com redirectors are
        // left untouched.
        if (url.includes("shareasale.com")) return url;
        return setQueryParam(url, "afftrack", publisherId);
      }
      case "generic": {
        return setQueryParam(url, "ref", publisherId);
      }
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Set (not append) a query param — if the key already exists with our
 * publisher ID, return the URL unchanged; otherwise overwrite. This is the
 * idempotency guarantee for query-param networks so accidental double-
 * wrapping cannot produce `?subid=id&subid=id`.
 *
 * Uses the WHATWG URL parser (available in Hermes/RN 0.81+ and all modern
 * browsers). A parser failure falls through to a naive append rather than
 * mangling the URL.
 */
function setQueryParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url);
    const existing = parsed.searchParams.get(key);
    if (existing === value) return url;
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

/** True if EITHER the runtime override OR the env vars are configured. */
export function isAffiliateConfigured(): boolean {
  return activeConfig() !== null;
}

/** The currently-active network name (for diagnostics / settings screens). */
export function affiliateNetwork(): AffiliateNetwork | null {
  const cfg = activeConfig();
  return cfg ? (cfg.network as AffiliateNetwork) : null;
}
