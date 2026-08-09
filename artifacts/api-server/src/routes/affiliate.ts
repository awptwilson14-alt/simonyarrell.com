import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  affiliateClicks,
  affiliateProducts,
  affiliatePartnerships,
  affiliateLinks,
} from "@workspace/db";

const router: IRouter = Router();

/**
 * Affiliate monetization API.
 *
 *   POST /api/affiliate/clicks    — record a BUY tap (public; called by every
 *                                   client at click time, fire-and-forget)
 *   GET  /api/affiliate/stats     — owner analytics dashboard (admin-gated)
 *   GET  /api/affiliate/products  — list product DB rows (admin-gated)
 *   POST /api/affiliate/products  — create/update a product row (admin-gated)
 *
 * Same admin gate as promo.ts: `x-admin-key` header must match the
 * ADMIN_PROMO_KEY secret. Fail closed (503) when unset.
 */
const requireAdmin: RequestHandler = (req, res, next) => {
  const key = process.env.ADMIN_PROMO_KEY;
  if (!key || key.length === 0) {
    res.status(503).json({ error: "Admin features are not configured" });
    return;
  }
  const supplied = req.header("x-admin-key");
  if (!supplied || supplied !== key) {
    res.status(401).json({ error: "Invalid admin key" });
    return;
  }
  next();
};

// ── Click tracking ───────────────────────────────────────────────────────────

const ClickBody = z.object({
  userId: z.string().max(200).optional(),
  productName: z.string().min(1).max(300),
  brand: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  retailer: z.string().max(200).optional(),
  network: z.string().max(50).optional(),
  lookName: z.string().max(300).optional(),
  url: z.string().max(2000).optional(),
  priceCents: z.number().int().min(0).max(100_000_000).optional(),
  eventType: z
    .enum([
      "product_view",
      "shop_click",
      "retailer_click",
      "affiliate_click",
      "outfit_click",
      "buy_outfit_click",
    ])
    .optional(),
});

// Cheap in-memory per-IP rate limiter for the public click endpoint. Clicks
// are human-paced (a BUY tap opens the retailer site), so 30/min/IP is far
// above legitimate use while blunting bulk fabrication + DB-growth abuse.
const clickWindow = new Map<string, { count: number; resetAt: number }>();
const CLICK_LIMIT = 30;
const CLICK_WINDOW_MS = 60_000;
function clickAllowed(ip: string): boolean {
  const now = Date.now();
  const w = clickWindow.get(ip);
  if (!w || now >= w.resetAt) {
    clickWindow.set(ip, { count: 1, resetAt: now + CLICK_WINDOW_MS });
    // Opportunistic sweep so the map can't grow unboundedly.
    if (clickWindow.size > 10_000) {
      for (const [k, v] of clickWindow) if (now >= v.resetAt) clickWindow.delete(k);
    }
    return true;
  }
  w.count += 1;
  return w.count <= CLICK_LIMIT;
}

const clickHandler: RequestHandler = async (req, res) => {
  if (!clickAllowed(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many clicks" });
    return;
  }
  const parsed = ClickBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid click payload" });
    return;
  }
  try {
    const b = parsed.data;
    await db.insert(affiliateClicks).values({
      userId: b.userId ?? null,
      productName: b.productName,
      brand: b.brand,
      category: b.category ?? null,
      retailer: b.retailer ?? null,
      network: b.network ?? "skimlinks",
      lookName: b.lookName ?? null,
      url: b.url ?? null,
      priceCents: b.priceCents ?? null,
      eventType: b.eventType ?? "affiliate_click",
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to record click" });
  }
};
router.post("/affiliate/clicks", clickHandler);
router.post("/affiliate/click", clickHandler); // spec alias

// ── Analytics (owner dashboard) ──────────────────────────────────────────────

router.get("/affiliate/stats", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inWindow = gte(affiliateClicks.createdAt, since);

    const top = (
      col:
        | typeof affiliateClicks.brand
        | typeof affiliateClicks.productName
        | typeof affiliateClicks.retailer
        | typeof affiliateClicks.lookName,
    ) =>
      db
        .select({ name: col, clicks: sql<number>`count(*)::int` })
        .from(affiliateClicks)
        .where(and(inWindow, sql`${col} is not null`))
        .groupBy(col)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

    const [totals, daily, topBrands, topProducts, topRetailers, topLooks] =
      await Promise.all([
        db
          .select({
            clicks: sql<number>`count(*)::int`,
            purchases: sql<number>`count(${affiliateClicks.purchased})::int`,
            revenue: sql<string>`coalesce(sum(${affiliateClicks.commissionEarned}), 0)::text`,
          })
          .from(affiliateClicks)
          .where(inWindow),
        db
          .select({
            day: sql<string>`to_char(${affiliateClicks.createdAt}, 'YYYY-MM-DD')`,
            clicks: sql<number>`count(*)::int`,
          })
          .from(affiliateClicks)
          .where(inWindow)
          .groupBy(sql`to_char(${affiliateClicks.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(sql`to_char(${affiliateClicks.createdAt}, 'YYYY-MM-DD')`),
        top(affiliateClicks.brand),
        top(affiliateClicks.productName),
        top(affiliateClicks.retailer),
        top(affiliateClicks.lookName),
      ]);

    const t = totals[0] ?? { clicks: 0, purchases: 0, revenue: "0" };
    res.json({
      days,
      totalClicks: t.clicks,
      purchases: t.purchases,
      conversionRate: t.clicks > 0 ? t.purchases / t.clicks : 0,
      revenue: t.revenue,
      daily,
      topBrands,
      topProducts,
      topRetailers,
      topLooks,
    });
  } catch {
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ── Conversion reporting (admin) ─────────────────────────────────────────────
// Affiliate networks report conversions offline (dashboards/CSV). This lets
// the owner reconcile a reported sale onto a click row so Purchases /
// Conversion / Revenue on the dashboard reflect reality.

const ConversionBody = z.object({
  clickId: z.number().int().positive(),
  commissionEarned: z.number().min(0).max(1_000_000),
  purchasedAt: z.string().datetime().optional(),
});

router.post("/affiliate/conversions", requireAdmin, async (req, res) => {
  const parsed = ConversionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid conversion payload" });
    return;
  }
  try {
    const b = parsed.data;
    const [row] = await db
      .update(affiliateClicks)
      .set({
        purchased: b.purchasedAt ? new Date(b.purchasedAt) : new Date(),
        commissionEarned: String(b.commissionEarned),
      })
      .where(eq(affiliateClicks.id, b.clickId))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Click not found" });
      return;
    }
    res.json({ ok: true, click: row });
  } catch {
    res.status(500).json({ error: "Failed to record conversion" });
  }
});

// ── Product database (admin CRUD) ────────────────────────────────────────────

const ProductBody = z.object({
  productName: z.string().min(1).max(300),
  brand: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  retailer: z.string().min(1).max(200),
  retailPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  images: z.array(z.string().max(2000)).max(20).optional(),
  description: z.string().max(5000).optional(),
  color: z.string().max(100).optional(),
  sizes: z.array(z.string().max(30)).max(50).optional(),
  affiliateUrl: z.string().min(1).max(2000),
  originalUrl: z.string().min(1).max(2000),
  sku: z.string().max(200).optional(),
  commissionNetwork: z.string().max(50).optional(),
});

router.get("/affiliate/products", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(affiliateProducts)
      .orderBy(desc(affiliateProducts.updatedAt))
      .limit(500);
    res.json({ products: rows });
  } catch {
    res.status(500).json({ error: "Failed to list products" });
  }
});

router.post("/affiliate/products", requireAdmin, async (req, res) => {
  const parsed = ProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product payload" });
    return;
  }
  try {
    const b = parsed.data;
    const values = {
      productName: b.productName,
      brand: b.brand,
      category: b.category,
      retailer: b.retailer,
      retailPrice: b.retailPrice != null ? String(b.retailPrice) : null,
      salePrice: b.salePrice != null ? String(b.salePrice) : null,
      currency: b.currency ?? "USD",
      images: b.images ?? [],
      description: b.description ?? null,
      color: b.color ?? null,
      sizes: b.sizes ?? [],
      affiliateUrl: b.affiliateUrl,
      originalUrl: b.originalUrl,
      sku: b.sku ?? null,
      commissionNetwork: b.commissionNetwork ?? "skimlinks",
      updatedAt: new Date(),
    };
    // Upsert on (retailer, sku) when a SKU is supplied; plain insert otherwise.
    if (b.sku) {
      const existing = await db
        .select({ id: affiliateProducts.id })
        .from(affiliateProducts)
        .where(and(eq(affiliateProducts.retailer, b.retailer), eq(affiliateProducts.sku, b.sku)))
        .limit(1);
      if (existing.length > 0) {
        const [row] = await db
          .update(affiliateProducts)
          .set(values)
          .where(eq(affiliateProducts.id, existing[0].id))
          .returning();
        res.json({ product: row, updated: true });
        return;
      }
    }
    const [row] = await db.insert(affiliateProducts).values(values).returning();
    res.json({ product: row, updated: false });
  } catch {
    res.status(500).json({ error: "Failed to save product" });
  }
});

// ── Partnerships (central affiliate resolver) ────────────────────────────────
// affiliate_partnerships is the SOURCE OF TRUTH. RULES:
// - Only status "active" rows (within their starts/ends window, with deep
//   linking enabled) can generate an affiliate link. pending/applied/
//   rejected/expired/suspended/unavailable/not_partnered never monetize.
// - deepLinkTemplate must be pasted from the network's own deep-link tools
//   (e.g. Rakuten Advertising link generator) with a {url} placeholder. The
//   server/app NEVER constructs or guesses tracking URLs, advertiser IDs,
//   MIDs, offer IDs, or parameters.
// - commissionRate is informational for the admin dashboard only — it is
//   never consulted when choosing products or resolving links.

const PARTNERSHIP_STATUSES = [
  "active",
  "pending",
  "applied",
  "not_partnered",
  "rejected",
  "expired",
  "suspended",
  "unavailable",
] as const;

const PartnershipBody = z.object({
  /** Retailer hostname, e.g. "mrporter.com" (lowercased, www stripped). */
  retailer: z.string().min(3).max(200),
  network: z.string().min(2).max(50),
  advertiserId: z.string().max(100).optional(),
  status: z.enum(PARTNERSHIP_STATUSES),
  commissionRate: z.number().min(0).max(100).optional(),
  cookieWindowDays: z.number().int().min(0).max(3650).optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  country: z.string().max(10).optional(),
  deepLinkEnabled: z.boolean().optional(),
  productFeedEnabled: z.boolean().optional(),
  apiEnabled: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  deepLinkTemplate: z
    .string()
    .max(2000)
    .refine((t) => t.includes("{url}"), { message: "template must contain {url}" })
    .optional(),
  lastAffiliateCheck: z.string().datetime().optional(),
});

// Default resolver order when priorities tie: direct retailer program first,
// then Rakuten, Awin, Impact, CJ, and Skimlinks as the broad fallback.
const NETWORK_ORDER = ["direct", "rakuten", "awin", "impact", "cj", "skimlinks"];
const networkRank = (n: string): number => {
  const i = NETWORK_ORDER.indexOf(n);
  return i === -1 ? NETWORK_ORDER.length : i;
};

type PartnershipRow = typeof affiliatePartnerships.$inferSelect;

function isCurrentlyValid(p: PartnershipRow, now = new Date()): boolean {
  if (p.status !== "active") return false;
  if (!p.deepLinkEnabled) return false;
  if (!p.deepLinkTemplate || !p.deepLinkTemplate.includes("{url}")) return false;
  if (p.startsAt && p.startsAt > now) return false;
  if (p.endsAt && p.endsAt < now) return false;
  return true;
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Attribution query params the supported networks put on DIRECT merchant
// URLs (rakuten u1, awin awc, impact irclickid, cj sid, ltk subid,
// shareasale afftrack). Presence ⇒ the URL is already monetized and must be
// treated as immutable — mirror of the mobile resolver's guard.
const TRACKING_PARAMS = ["u1", "awc", "irclickid", "sid", "subid", "afftrack"];
function hasExistingTrackingParam(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRACKING_PARAMS.some((k) => parsed.searchParams.has(k));
  } catch {
    return false;
  }
}

/** Pick the winning ACTIVE partnership for a retailer host. */
async function pickPartnership(
  host: string,
  country?: string,
): Promise<PartnershipRow | null> {
  const rows = await db
    .select()
    .from(affiliatePartnerships)
    .where(eq(affiliatePartnerships.status, "active"));
  // Country eligibility: country-restricted partnerships require a MATCHING
  // country signal. When the caller supplies no country, restricted rows are
  // excluded entirely (fail safe — never serve a link outside its territory).
  const candidates = rows.filter(
    (p) =>
      (host === p.retailer || host.endsWith(`.${p.retailer}`)) &&
      isCurrentlyValid(p) &&
      (!p.country || (country != null && p.country.toLowerCase() === country.toLowerCase())),
  );
  candidates.sort(
    (a, b) => a.priority - b.priority || networkRank(a.network) - networkRank(b.network),
  );
  return candidates[0] ?? null;
}

const applyTemplate = (template: string, dest: string): string =>
  template.replace("{url}", encodeURIComponent(dest));

interface Resolution {
  finalUrl: string;
  network: string | null;
  advertiserId: string | null;
  status: string;
  isMonetized: boolean;
  reason: string;
}

/**
 * Core resolution: original URL in, monetized (or original) URL out.
 * NEVER throws — any failure returns the original URL so shopping keeps
 * working. Caches generated links in affiliate_links (original_url is never
 * overwritten anywhere).
 */
async function resolveAffiliateUrl(
  originalUrl: string,
  opts: { productId?: number; country?: string } = {},
): Promise<Resolution> {
  const fallback: Resolution = {
    finalUrl: originalUrl,
    network: null,
    advertiserId: null,
    status: "none",
    isMonetized: false,
    reason: "no_active_partnership",
  };
  try {
    if (!/^https?:\/\//i.test(originalUrl)) return { ...fallback, reason: "invalid_url" };
    // Already an authorized redirector / tagged URL → immutable.
    if (
      /click\.linksynergy\.com|go\.skimresources\.com|awin1\.com|anrdoezrs\.net|dpbolvw\.net|shareasale\.com|\bpxf\.io\b|shopltk\.com|liketk\.it/i.test(originalUrl) ||
      hasExistingTrackingParam(originalUrl)
    ) {
      return { ...fallback, finalUrl: originalUrl, reason: "already_monetized" };
    }
    const host = hostFromUrl(originalUrl);
    if (!host) return { ...fallback, reason: "invalid_url" };
    const partnership = await pickPartnership(host, opts.country);
    if (!partnership) return fallback;

    // Valid cached link?
    const now = new Date();
    const [cached] = await db
      .select()
      .from(affiliateLinks)
      .where(
        and(
          eq(affiliateLinks.originalUrl, originalUrl),
          eq(affiliateLinks.network, partnership.network),
          eq(affiliateLinks.status, "active"),
        ),
      )
      .limit(1);
    if (cached && (!cached.expiresAt || cached.expiresAt > now)) {
      return {
        finalUrl: cached.affiliateUrl,
        network: cached.network,
        advertiserId: cached.advertiserId,
        status: "active",
        isMonetized: true,
        reason: "cached",
      };
    }

    // Generate from the authorized template and validate the destination
    // survived intact (exact URL round-trip through the {url} slot).
    const affiliateUrl = applyTemplate(partnership.deepLinkTemplate!, originalUrl);
    if (!affiliateUrl.includes(encodeURIComponent(originalUrl))) {
      return { ...fallback, reason: "template_validation_failed" };
    }
    await db
      .insert(affiliateLinks)
      .values({
        productId: opts.productId ?? null,
        retailer: partnership.retailer,
        network: partnership.network,
        advertiserId: partnership.advertiserId,
        originalUrl,
        affiliateUrl,
        status: "active",
        lastVerifiedAt: now,
      })
      .onConflictDoUpdate({
        target: [affiliateLinks.originalUrl, affiliateLinks.network],
        set: { affiliateUrl, status: "active", lastVerifiedAt: now, generatedAt: now },
      });
    return {
      finalUrl: affiliateUrl,
      network: partnership.network,
      advertiserId: partnership.advertiserId,
      status: "active",
      isMonetized: true,
      reason: "generated",
    };
  } catch {
    return { ...fallback, reason: "resolver_error" };
  }
}

// PUBLIC: resolve a product URL to its monetized destination.
const ResolveBody = z.object({
  productId: z.union([z.string(), z.number()]).optional(),
  retailerId: z.string().max(200).optional(),
  originalUrl: z.string().url().max(2000),
  country: z.string().max(10).optional(),
});

router.post("/affiliate/resolve", async (req, res) => {
  if (!clickAllowed(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  const parsed = ResolveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid resolve payload" });
    return;
  }
  const pid = Number(parsed.data.productId);
  const result = await resolveAffiliateUrl(parsed.data.originalUrl, {
    productId: Number.isInteger(pid) && pid > 0 ? pid : undefined,
    country: parsed.data.country,
  });
  res.json(result);
});

router.get("/affiliate/partnerships", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(affiliatePartnerships)
      .orderBy(desc(affiliatePartnerships.updatedAt));
    res.json({ partnerships: rows });
  } catch {
    res.status(500).json({ error: "Failed to list partnerships" });
  }
});

router.post("/affiliate/partnerships", requireAdmin, async (req, res) => {
  const parsed = PartnershipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid partnership payload" });
    return;
  }
  try {
    const b = parsed.data;
    const retailer = b.retailer.toLowerCase().replace(/^www\./, "");
    const values = {
      retailer,
      network: b.network.toLowerCase(),
      advertiserId: b.advertiserId ?? null,
      status: b.status,
      commissionRate: b.commissionRate != null ? String(b.commissionRate) : null,
      cookieWindowDays: b.cookieWindowDays ?? null,
      priority: b.priority ?? 100,
      country: b.country?.toUpperCase() ?? null,
      deepLinkEnabled: b.deepLinkEnabled ?? true,
      productFeedEnabled: b.productFeedEnabled ?? false,
      apiEnabled: b.apiEnabled ?? false,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      deepLinkTemplate: b.deepLinkTemplate ?? null,
      lastAffiliateCheck: b.lastAffiliateCheck ? new Date(b.lastAffiliateCheck) : new Date(),
      updatedAt: new Date(),
    };
    const existing = await db
      .select({ id: affiliatePartnerships.id })
      .from(affiliatePartnerships)
      .where(
        and(
          eq(affiliatePartnerships.retailer, retailer),
          eq(affiliatePartnerships.network, values.network),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      const [row] = await db
        .update(affiliatePartnerships)
        .set(values)
        .where(eq(affiliatePartnerships.id, existing[0].id))
        .returning();
      res.json({ partnership: row, updated: true });
      return;
    }
    const [row] = await db.insert(affiliatePartnerships).values(values).returning();
    res.json({ partnership: row, updated: false });
  } catch {
    res.status(500).json({ error: "Failed to save partnership" });
  }
});

// Admin: partial update of a single partnership.
router.patch("/affiliate/partnerships/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid partnership id" });
    return;
  }
  const parsed = PartnershipBody.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Invalid partnership patch" });
    return;
  }
  try {
    const b = parsed.data;
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (b.retailer !== undefined) set.retailer = b.retailer.toLowerCase().replace(/^www\./, "");
    if (b.network !== undefined) set.network = b.network.toLowerCase();
    if (b.advertiserId !== undefined) set.advertiserId = b.advertiserId;
    if (b.status !== undefined) set.status = b.status;
    if (b.commissionRate !== undefined) set.commissionRate = String(b.commissionRate);
    if (b.cookieWindowDays !== undefined) set.cookieWindowDays = b.cookieWindowDays;
    if (b.priority !== undefined) set.priority = b.priority;
    if (b.country !== undefined) set.country = b.country?.toUpperCase() ?? null;
    if (b.deepLinkEnabled !== undefined) set.deepLinkEnabled = b.deepLinkEnabled;
    if (b.productFeedEnabled !== undefined) set.productFeedEnabled = b.productFeedEnabled;
    if (b.apiEnabled !== undefined) set.apiEnabled = b.apiEnabled;
    if (b.startsAt !== undefined) set.startsAt = new Date(b.startsAt);
    if (b.endsAt !== undefined) set.endsAt = new Date(b.endsAt);
    if (b.deepLinkTemplate !== undefined) set.deepLinkTemplate = b.deepLinkTemplate;
    if (b.lastAffiliateCheck !== undefined) set.lastAffiliateCheck = new Date(b.lastAffiliateCheck);
    const [row] = await db
      .update(affiliatePartnerships)
      .set(set)
      .where(eq(affiliatePartnerships.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Partnership not found" });
      return;
    }
    res.json({ partnership: row });
  } catch {
    res.status(500).json({ error: "Failed to update partnership" });
  }
});

// PUBLIC: the resolver feed the app caches (offline / synchronous web-click
// fallback). Serves ONLY currently-valid active partnerships, and only the
// fields the client needs to substitute a destination into an authorized
// template — no credentials, no commission data.
router.get("/affiliate/partnerships/active", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(affiliatePartnerships)
      .where(eq(affiliatePartnerships.status, "active"));
    // Cacheable for an hour — partnerships change rarely and the client also
    // persists its own copy.
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({
      partnerships: rows
        // Country-restricted rows are excluded from the offline feed — the
        // client has no reliable country signal, so it must never apply a
        // territory-limited link. Those retailers resolve via the server.
        .filter((p) => isCurrentlyValid(p) && !p.country)
        .sort((a, b) => a.priority - b.priority || networkRank(a.network) - networkRank(b.network))
        .map((p) => ({
          retailer: p.retailer,
          network: p.network,
          deepLinkTemplate: p.deepLinkTemplate,
          priority: p.priority,
        })),
    });
  } catch {
    res.status(500).json({ error: "Failed to list active partnerships" });
  }
});

// PUBLIC: partnerships for one retailer (statuses only — lets a client show
// "monetized via Rakuten" style info; no templates or commission data).
router.get("/affiliate/partnerships/:retailerId", async (req, res) => {
  const retailer = String(req.params.retailerId).toLowerCase().replace(/^www\./, "");
  try {
    const rows = await db
      .select({
        retailer: affiliatePartnerships.retailer,
        network: affiliatePartnerships.network,
        status: affiliatePartnerships.status,
        priority: affiliatePartnerships.priority,
      })
      .from(affiliatePartnerships)
      .where(eq(affiliatePartnerships.retailer, retailer));
    res.json({ partnerships: rows });
  } catch {
    res.status(500).json({ error: "Failed to list partnerships" });
  }
});

// Admin: background validation sweep — expire cached links whose backing
// partnership is no longer currently valid, so dead affiliate links are
// never served again. (Run after editing partnerships, or periodically.)
router.post("/affiliate/refresh", requireAdmin, async (_req, res) => {
  try {
    const partnerships = await db.select().from(affiliatePartnerships);
    const validKeys = new Set(
      partnerships.filter((p) => isCurrentlyValid(p)).map((p) => `${p.retailer}|${p.network}`),
    );
    const links = await db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.status, "active"));
    let expired = 0;
    for (const l of links) {
      if (!validKeys.has(`${l.retailer}|${l.network}`)) {
        await db
          .update(affiliateLinks)
          .set({ status: "expired" })
          .where(eq(affiliateLinks.id, l.id));
        expired += 1;
      }
    }
    res.json({ ok: true, checked: links.length, expired });
  } catch {
    res.status(500).json({ error: "Refresh failed" });
  }
});

// ── Redirect route: /api/go/:productId ───────────────────────────────────────
// Server-side click log + resolve + 302, for surfaces that prefer a short
// stable URL over a long affiliate URL (e.g. web anchors, emails). Product
// must exist in the affiliate_products DB.
router.get("/go/:productId", async (req, res) => {
  const id = Number(req.params.productId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  try {
    const [product] = await db
      .select()
      .from(affiliateProducts)
      .where(eq(affiliateProducts.id, id))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const resolution = await resolveAffiliateUrl(product.originalUrl, { productId: id });
    // Log the click BEFORE redirecting (fire-and-forget failure-safe).
    try {
      await db.insert(affiliateClicks).values({
        productName: product.productName,
        brand: product.brand,
        category: product.category,
        retailer: product.retailer,
        network: resolution.network ?? "none",
        url: product.originalUrl,
        eventType: "retailer_click",
      });
      if (resolution.isMonetized) {
        await db
          .update(affiliateLinks)
          .set({ clickCount: sql`${affiliateLinks.clickCount} + 1` })
          .where(
            and(
              eq(affiliateLinks.originalUrl, product.originalUrl),
              eq(affiliateLinks.network, resolution.network ?? ""),
            ),
          );
      }
    } catch {
      // logging must never block the redirect
    }
    res.redirect(302, resolution.finalUrl);
  } catch {
    res.status(500).json({ error: "Redirect failed" });
  }
});

export default router;
