import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, affiliateClicks, affiliateProducts } from "@workspace/db";

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

router.post("/affiliate/clicks", async (req, res) => {
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
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to record click" });
  }
});

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

export default router;
