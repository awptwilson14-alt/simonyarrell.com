/**
 * AffiliateLinkService — THE single, centralized affiliate-link resolver for
 * the entire Simon Yarrell platform. Every outbound retailer URL flows
 * through `resolveMonetizedUrl()` exactly once, at click time, via
 * `openExternalUrl()` — no screen implements its own affiliate logic.
 *
 * Resolution priority (Rakuten implementation spec):
 *
 *   Active Rakuten partnership for this retailer
 *           ↓  authorized Rakuten deep-link template
 *   Other ACTIVE network partnership for this retailer
 *           ↓  that network's authorized template
 *   Site-wide configured network (e.g. Skimlinks wrapper)
 *           ↓
 *   Original retailer URL (shopping always keeps working)
 *
 * HARD RULES:
 * - The destination product NEVER changes: templates only receive the exact
 *   PDP URL, encoded, in the {url} slot. Brand/name/image/price/identity are
 *   untouched — this file only ever sees the URL string.
 * - NEVER fabricate tracking links: templates come exclusively from the
 *   server (`/api/affiliate/partnerships/active`), where the owner pastes
 *   them from the network's own deep-link tools. If a retailer has no
 *   active partnership + template, we fall back — we never guess advertiser
 *   IDs, MIDs, offer IDs, or parameters.
 * - Only ACTIVE partnerships monetize (the server endpoint filters status).
 * - Commission NEVER influences styling: the engine/AI picks products first;
 *   this resolver runs at click time, after everything is already displayed.
 * - No credentials live here: templates are public-facing URLs; Rakuten API
 *   keys (if ever used) stay server-side.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyAffiliate } from "./affiliate";
import {
  apiUrl,
  trackAffiliateClick,
  type AffiliateEventType,
} from "./affiliateTracking";
import { openExternalUrl } from "./openExternal";

export interface ActivePartnership {
  retailer: string; // hostname key, lowercase, no www — e.g. "mrporter.com"
  network: string; // "direct" | "rakuten" | "awin" | "impact" | "cj" | "skimlinks" | ...
  deepLinkTemplate: string; // contains "{url}"
  priority?: number; // configurable resolver order — lower wins
}

// Default order when priorities tie (mirrors the server resolver):
// direct retailer program → rakuten → awin → impact → cj → skimlinks.
const NETWORK_ORDER = ["direct", "rakuten", "awin", "impact", "cj", "skimlinks"];
const networkRank = (n: string): number => {
  const i = NETWORK_ORDER.indexOf(n);
  return i === -1 ? NETWORK_ORDER.length : i;
};

const STORAGE_KEY = "sy.affiliatePartnerships.v1";
const REFRESH_MS = 60 * 60 * 1000; // 1h

let _partnerships: ActivePartnership[] = [];
let _loaded = false;
let _lastFetch = 0;

/** Hostname (lowercase, no www) for retailer identification. */
export function retailerKeyFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function valid(p: unknown): p is ActivePartnership {
  return (
    !!p &&
    typeof p === "object" &&
    typeof (p as ActivePartnership).retailer === "string" &&
    typeof (p as ActivePartnership).network === "string" &&
    typeof (p as ActivePartnership).deepLinkTemplate === "string" &&
    (p as ActivePartnership).deepLinkTemplate.includes("{url}")
  );
}

/**
 * Load the cached partnership list, then refresh from the server in the
 * background. Fire-and-forget from app startup; resolution works with
 * whatever is loaded (no partnerships ⇒ clean fallback, shopping never
 * blocks on this).
 */
export async function hydrateAffiliatePartnerships(): Promise<void> {
  if (!_loaded) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) _partnerships = parsed.filter(valid);
      }
    } catch {
      // cache miss is fine
    }
    _loaded = true;
  }
  const now = Date.now();
  if (now - _lastFetch < REFRESH_MS) return;
  _lastFetch = now;
  try {
    const res = await fetch(apiUrl("/api/affiliate/partnerships/active"));
    if (!res.ok) return;
    const body = (await res.json()) as { partnerships?: unknown[] };
    if (Array.isArray(body.partnerships)) {
      _partnerships = body.partnerships.filter(valid);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_partnerships)).catch(() => {});
    }
  } catch {
    // offline — keep cached list
  }
}

// Known network redirector hosts (every network affiliate.ts supports):
// Rakuten, Skimlinks, Awin, CJ (both redirector domains), ShareASale,
// Impact (pxf.io), LTK (shopltk.com / liketk.it).
const REDIRECTOR_HOST_RE =
  /click\.linksynergy\.com|go\.skimresources\.com|awin1\.com|anrdoezrs\.net|dpbolvw\.net|shareasale\.com|\bpxf\.io\b|shopltk\.com|liketk\.it/i;

// Attribution query params the supported networks put on DIRECT merchant
// URLs (rakuten u1, awin awc, impact irclickid, cj sid, ltk subid,
// shareasale afftrack). If one is already present the URL is already
// monetized — treat it as immutable rather than overwrite attribution.
const TRACKING_PARAMS = ["u1", "awc", "irclickid", "sid", "subid", "afftrack"] as const;
function hasExistingTrackingParam(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRACKING_PARAMS.some((k) => parsed.searchParams.has(k));
  } catch {
    return false;
  }
}

/** Substitute the exact destination into an authorized template. */
function applyTemplate(template: string, destinationUrl: string): string {
  return template.replace("{url}", encodeURIComponent(destinationUrl));
}

export interface ResolvedLink {
  url: string;
  network: string | null; // network expected to pay, null = unmonetized
}

/**
 * Resolve the monetized destination for a retailer product URL.
 * See the priority chain in the file header. Always returns a usable URL.
 */
export function resolveMonetizedUrl(originalUrl: string): ResolvedLink {
  if (!originalUrl || !/^https?:\/\//i.test(originalUrl)) {
    return { url: originalUrl, network: null };
  }
  // Already an authorized network redirector (e.g. a pasted Rakuten link in
  // the product DB) or a merchant URL that already carries a network's
  // attribution parameter? Leave it alone — NEVER strip, nest, or re-wrap
  // existing tracking. Covers every network affiliate.ts supports.
  if (REDIRECTOR_HOST_RE.test(originalUrl) || hasExistingTrackingParam(originalUrl)) {
    return { url: originalUrl, network: "preserved" };
  }
  const host = retailerKeyFromUrl(originalUrl);
  if (host) {
    const matches = _partnerships
      .filter((p) => host === p.retailer || host.endsWith(`.${p.retailer}`))
      .sort(
        (a, b) =>
          (a.priority ?? 100) - (b.priority ?? 100) ||
          networkRank(a.network) - networkRank(b.network),
      );
    // 1–2. Highest-priority active partnership for this retailer (direct →
    // rakuten → awin → impact → cj → skimlinks unless priority overrides).
    if (matches[0]) {
      return { url: applyTemplate(matches[0].deepLinkTemplate, originalUrl), network: matches[0].network };
    }
  }
  // 3. Site-wide configured wrapper (Skimlinks etc.) — no-op when off.
  const wrapped = applyAffiliate(originalUrl);
  if (wrapped !== originalUrl) return { url: wrapped, network: "sitewide" };
  // 4. No authorized relationship — original retailer URL; shopping still works.
  return { url: originalUrl, network: null };
}

/**
 * Ask the SERVER resolver (POST /api/affiliate/resolve — the source of
 * truth, with priority config + link cache) for the monetized URL. Used on
 * native, where an awaited fetch before Linking.openURL is fine. On web the
 * caller must stay synchronous (popup blockers), so it uses the local
 * resolver above instead. Any failure/timeout falls back to local
 * resolution — monetization must never break or delay shopping noticeably.
 */
export async function resolveMonetizedUrlViaServer(
  originalUrl: string,
  timeoutMs = 2500,
): Promise<ResolvedLink> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(apiUrl("/api/affiliate/resolve"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalUrl }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const body = (await res.json()) as { finalUrl?: string; network?: string | null };
      if (typeof body.finalUrl === "string" && /^https?:\/\//i.test(body.finalUrl)) {
        return { url: body.finalUrl, network: body.network ?? null };
      }
    }
  } catch {
    // offline / slow — fall through to local resolution
  }
  return resolveMonetizedUrl(originalUrl);
}

export interface AffiliateProductLike {
  name: string;
  brand: string;
  category?: string;
  price?: number;
  purchaseUrl?: string;
  lookName?: string;
}

/**
 * THE shared shopping-button handler (spec §8): every Buy / Shop Now /
 * View Product / Buy This Outfit / retailer button calls this one function.
 * It logs the click (fire-and-forget) and opens the resolved monetized URL.
 * No screen/component may implement its own network-specific logic.
 */
export function openAffiliateProduct(
  product: AffiliateProductLike,
  eventType: AffiliateEventType = "affiliate_click",
): void {
  if (!product.purchaseUrl) return;
  trackAffiliateClick({
    productName: product.name,
    brand: product.brand,
    category: product.category,
    url: product.purchaseUrl,
    price: product.price,
    lookName: product.lookName,
    eventType,
  });
  openExternalUrl(product.purchaseUrl);
}
