/**
 * Affiliate click analytics — client side.
 *
 * Every BUY tap fires `trackAffiliateClick` (fire-and-forget, never blocks or
 * fails the navigation) so the owner's analytics dashboard can show daily
 * clicks, top brands/products/retailers/outfits and (once conversions are
 * reported by the network) revenue. Server side: POST /api/affiliate/clicks.
 */
import { effectiveRuntimeConfig } from "./affiliateSettings";

function resolveApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  const dev =
    process.env.EXPO_PUBLIC_DOMAIN || process.env.EXPO_PUBLIC_REPLIT_DEV_DOMAIN;
  if (dev && dev.length > 0) return `https://${dev}`;
  return "";
}
const API_BASE = resolveApiBase();

/** Absolute API URL for a server path (shared by affiliate modules). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Anonymous per-install id (RevenueCat appUserId) — set once by
// EntitlementsContext when the subscription SDK resolves. Optional.
let trackedUserId: string | null = null;
export function setAffiliateTrackingUserId(id: string | null): void {
  trackedUserId = id;
}

/** Derive a human retailer name from the destination URL's hostname. */
function retailerFromUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0];
  } catch {
    return undefined;
  }
}

export type AffiliateEventType =
  | "product_view"
  | "shop_click"
  | "retailer_click"
  | "affiliate_click"
  | "outfit_click"
  | "buy_outfit_click";

export interface AffiliateClickEvent {
  productName: string;
  brand: string;
  category?: string;
  /** Raw destination URL (pre-affiliate-wrap). */
  url?: string;
  /** Look/outfit name when the tap came from a look detail. */
  lookName?: string;
  price?: number;
  /** Interaction type — defaults to affiliate_click on the server. */
  eventType?: AffiliateEventType;
}

/** Record a BUY tap. Fire-and-forget — never throws, never blocks. */
export function trackAffiliateClick(ev: AffiliateClickEvent): void {
  try {
    const cfg = effectiveRuntimeConfig();
    const body = JSON.stringify({
      userId: trackedUserId ?? undefined,
      productName: ev.productName.slice(0, 300),
      brand: ev.brand.slice(0, 200),
      category: ev.category,
      retailer: retailerFromUrl(ev.url),
      network: cfg?.network ?? "skimlinks",
      lookName: ev.lookName?.slice(0, 300),
      url: ev.url?.slice(0, 2000),
      priceCents:
        typeof ev.price === "number" && Number.isFinite(ev.price)
          ? Math.round(ev.price * 100)
          : undefined,
      eventType: ev.eventType,
    });
    fetch(`${API_BASE}/api/affiliate/clicks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // Web: allow the request to outlive the page (user is navigating away
      // to the retailer). Ignored on native.
      keepalive: true,
    } as RequestInit).catch(() => {});
  } catch {
    /* analytics must never break a purchase tap */
  }
}

// ── Owner dashboard fetch ────────────────────────────────────────────────────

export interface TopRow {
  name: string | null;
  clicks: number;
}
export interface AffiliateStats {
  days: number;
  totalClicks: number;
  purchases: number;
  conversionRate: number;
  revenue: string;
  daily: { day: string; clicks: number }[];
  topBrands: TopRow[];
  topProducts: TopRow[];
  topRetailers: TopRow[];
  topLooks: TopRow[];
}

export async function fetchAffiliateStats(
  adminKey: string,
  days = 30,
): Promise<AffiliateStats> {
  const res = await fetch(`${API_BASE}/api/affiliate/stats?days=${days}`, {
    headers: { "x-admin-key": adminKey },
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Invalid admin key" : "Failed to load stats");
  }
  return (await res.json()) as AffiliateStats;
}
