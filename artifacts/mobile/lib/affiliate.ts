/**
 * Affiliate URL tagging.
 *
 * Every BUY-tap URL flows through `applyAffiliate(url)` at the moment of
 * navigation (NOT at catalog/engine construction time — see the architecture
 * note below). The moment the user signs up to an affiliate network we earn
 * commission on every tap without touching the catalog or the engine.
 *
 * Configuration is env-driven so credentials never live in source:
 *   EXPO_PUBLIC_AFFILIATE_NETWORK — one of: "skimlinks" | "rakuten" |
 *     "impact" | "awin" | "generic"
 *   EXPO_PUBLIC_AFFILIATE_ID — the publisher / site ID from the network
 *
 * When either is unset OR the network is not a recognised value,
 * `applyAffiliate` is a no-op and returns the original URL unchanged —
 * keeps dev / first-run installs working without surprise link mangling
 * and prevents an env-var typo from silently mutating every outbound link.
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

const ALLOWED_NETWORKS = ["skimlinks", "rakuten", "impact", "awin", "generic"] as const;
type Network = (typeof ALLOWED_NETWORKS)[number];

const RAW_NETWORK = (process.env.EXPO_PUBLIC_AFFILIATE_NETWORK ?? "")
  .toLowerCase()
  .trim();
const NETWORK: Network | "" = (ALLOWED_NETWORKS as readonly string[]).includes(RAW_NETWORK)
  ? (RAW_NETWORK as Network)
  : "";
const PUBLISHER_ID = (process.env.EXPO_PUBLIC_AFFILIATE_ID ?? "").trim();

const isValidHttp = (u: string): boolean => /^https?:\/\//i.test(u);

/**
 * Wrap a destination URL with the configured affiliate redirector. Returns
 * the original URL unchanged when not configured, when the input is not a
 * valid http(s) URL, when the env's NETWORK value isn't one we recognise,
 * or when the URL is already tagged for the active network.
 */
export function applyAffiliate(url: string): string {
  if (!url || !isValidHttp(url) || !NETWORK || !PUBLISHER_ID) return url;
  try {
    switch (NETWORK) {
      case "skimlinks": {
        if (url.includes("go.skimresources.com")) return url;
        return `https://go.skimresources.com/?id=${encodeURIComponent(PUBLISHER_ID)}&xs=1&url=${encodeURIComponent(url)}`;
      }
      case "awin": {
        if (url.includes("awin1.com")) return url;
        return setQueryParam(url, "awc", PUBLISHER_ID);
      }
      case "rakuten": {
        if (url.includes("click.linksynergy.com")) return url;
        return setQueryParam(url, "u1", PUBLISHER_ID);
      }
      case "impact": {
        if (/\bpxf\.io\b/.test(url)) return url;
        return setQueryParam(url, "irclickid", PUBLISHER_ID);
      }
      case "generic": {
        return setQueryParam(url, "ref", PUBLISHER_ID);
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
 * idempotency guarantee for query-param networks (rakuten/impact/awin/
 * generic) so accidental double-wrapping cannot produce `?u1=id&u1=id`.
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

/** True if an affiliate network has been configured at build/runtime. */
export function isAffiliateConfigured(): boolean {
  return Boolean(NETWORK && PUBLISHER_ID);
}

/** The configured network name (for diagnostics / settings screens). */
export function affiliateNetwork(): Network | null {
  return NETWORK ? NETWORK : null;
}
