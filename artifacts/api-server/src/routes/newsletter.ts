import { Router, type IRouter, type RequestHandler } from "express";
import { desc } from "drizzle-orm";
import {
  NewsletterSubscribeBody,
  NewsletterSubscribeResponse,
  ListNewsletterSubscribersResponse,
} from "@workspace/api-zod";
import { db, newsletterSubscribers } from "@workspace/db";

const router: IRouter = Router();

/**
 * Admin gate — same contract as the promo admin endpoints: the owner's
 * `ADMIN_PROMO_KEY` secret is sent as the `x-admin-key` header.
 *   • secret unset  → 503 (fail closed)
 *   • header missing/mismatch → 401
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

/** Trim + lowercase so "Jane@Example.com " and "jane@example.com" dedupe. */
function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// ─── Public: subscribe ───────────────────────────────────────────────────────
router.post("/newsletter/subscribe", async (req, res) => {
  const parsed = NewsletterSubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  // Zod's format check is loose on some generated schemas; enforce a sane shape.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address" });
    return;
  }
  try {
    const inserted = await db
      .insert(newsletterSubscribers)
      .values({ email, source: parsed.data.source ?? "landing" })
      .onConflictDoNothing({ target: newsletterSubscribers.email })
      .returning({ id: newsletterSubscribers.id });
    res.json(
      NewsletterSubscribeResponse.parse({
        ok: true,
        alreadySubscribed: inserted.length === 0,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "newsletter/subscribe: insert failed");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// ─── Admin: export subscribers ───────────────────────────────────────────────
router.get("/newsletter/subscribers", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt));
    if (req.query.format === "csv") {
      const header = "id,email,source,created_at";
      const lines = rows.map((r) =>
        [
          r.id,
          `"${r.email.replace(/"/g, '""')}"`,
          `"${(r.source ?? "").replace(/"/g, '""')}"`,
          r.createdAt.toISOString(),
        ].join(","),
      );
      res
        .type("text/csv")
        .setHeader(
          "Content-Disposition",
          'attachment; filename="newsletter-subscribers.csv"',
        )
        .send([header, ...lines].join("\n"));
      return;
    }
    res.json(
      ListNewsletterSubscribersResponse.parse(
        rows.map((r) => ({
          id: r.id,
          email: r.email,
          source: r.source,
          createdAt: r.createdAt.toISOString(),
        })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "newsletter/subscribers: list failed");
    res.status(500).json({ error: "Failed to list subscribers" });
  }
});

export default router;
