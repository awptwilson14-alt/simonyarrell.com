import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  PromoLookupQueryParams,
  PromoLookupResponse,
  ListPromoCodesResponse,
  CreatePromoCodeBody,
  CreatePromoCodeResponse,
  UpdatePromoCodeBody,
  UpdatePromoCodeResponse,
  DeletePromoCodeResponse,
} from "@workspace/api-zod";
import { db, promoCodes, type PromoCodeRow } from "@workspace/db";

const router: IRouter = Router();

/** Strip whitespace + uppercase so "maison 20" and "MAISON20" both match. */
function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Serialize a DB row to the API record shape (timestamps → ISO strings). */
function toRecord(row: PromoCodeRow) {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind as "percent_off" | "grant_tier",
    percent: row.percent ?? undefined,
    tier: (row.tier ?? undefined) as
      | "basic"
      | "premium"
      | "pro"
      | "vip"
      | "diamond"
      | undefined,
    label: row.label,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Admin gate. The admin CRUD endpoints mint codes that grant paid tiers, so
 * they MUST be protected. The owner sets a private `ADMIN_PROMO_KEY` secret;
 * the in-app admin screen sends it as the `x-admin-key` header.
 *
 *   • secret unset  → 503 (fail closed — admin features disabled)
 *   • header missing/mismatch → 401
 *
 * The public /promo/lookup endpoint is intentionally NOT gated (redemption
 * happens on every customer's device).
 */
const requireAdmin: RequestHandler = (req, res, next) => {
  const key = process.env.ADMIN_PROMO_KEY;
  if (!key || key.length === 0) {
    res.status(503).json({ error: "Promo admin is not configured" });
    return;
  }
  const supplied = req.header("x-admin-key");
  if (!supplied || supplied !== key) {
    res.status(401).json({ error: "Invalid admin key" });
    return;
  }
  next();
};

/** Validate kind-specific fields. Returns an error string or null. */
function validateEffect(
  kind: "percent_off" | "grant_tier",
  percent: number | undefined,
  tier: string | undefined,
): string | null {
  if (kind === "percent_off") {
    if (percent == null) return "percent is required for percent_off codes";
  } else {
    if (!tier) return "tier is required for grant_tier codes";
  }
  return null;
}

// ─── Public: redeem-time lookup ──────────────────────────────────────────────
router.get("/promo/lookup", async (req, res) => {
  const parsed = PromoLookupQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid query params", details: parsed.error.flatten() });
    return;
  }
  const code = normalizeCode(parsed.data.code);
  try {
    const rows = await db
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.code, code), eq(promoCodes.active, true)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      res.json(PromoLookupResponse.parse({ found: false }));
      return;
    }
    const body = PromoLookupResponse.parse({
      found: true,
      code: row.code,
      label: row.label,
      kind: row.kind,
      percent: row.percent ?? undefined,
      tier: row.tier ?? undefined,
    });
    res.json(body);
  } catch (err) {
    req.log.error({ err }, "promo/lookup: db read failed");
    res.status(500).json({ error: "Failed to look up promo code" });
  }
});

// ─── Admin: list ─────────────────────────────────────────────────────────────
router.get("/promo/codes", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.createdAt));
    res.json(ListPromoCodesResponse.parse(rows.map(toRecord)));
  } catch (err) {
    req.log.error({ err }, "promo/codes: list failed");
    res.status(500).json({ error: "Failed to list promo codes" });
  }
});

// ─── Admin: create ───────────────────────────────────────────────────────────
router.post("/promo/codes", requireAdmin, async (req, res) => {
  const parsed = CreatePromoCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { kind, percent, tier, label, active } = parsed.data;
  const code = normalizeCode(parsed.data.code);
  const effectErr = validateEffect(kind, percent, tier);
  if (effectErr) {
    res.status(400).json({ error: effectErr });
    return;
  }
  try {
    const existing = await db
      .select({ id: promoCodes.id })
      .from(promoCodes)
      .where(eq(promoCodes.code, code))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "A code with that name already exists" });
      return;
    }
    const inserted = await db
      .insert(promoCodes)
      .values({
        code,
        kind,
        percent: kind === "percent_off" ? (percent ?? null) : null,
        tier: kind === "grant_tier" ? (tier ?? null) : null,
        label,
        active: active ?? true,
      })
      .returning();
    res.json(CreatePromoCodeResponse.parse(toRecord(inserted[0])));
  } catch (err) {
    req.log.error({ err }, "promo/codes: create failed");
    res.status(500).json({ error: "Failed to create promo code" });
  }
});

// ─── Admin: update ───────────────────────────────────────────────────────────
router.patch("/promo/codes/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdatePromoCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);
    const current = rows[0];
    if (!current) {
      res.status(404).json({ error: "Code not found" });
      return;
    }

    const next = { ...parsed.data };
    const finalKind = (next.kind ?? current.kind) as
      | "percent_off"
      | "grant_tier";
    const finalPercent =
      next.percent !== undefined ? next.percent : (current.percent ?? undefined);
    const finalTier =
      next.tier !== undefined ? next.tier : (current.tier ?? undefined);
    const effectErr = validateEffect(finalKind, finalPercent, finalTier);
    if (effectErr) {
      res.status(400).json({ error: effectErr });
      return;
    }

    const set: Partial<typeof promoCodes.$inferInsert> = {};
    if (next.code !== undefined) set.code = normalizeCode(next.code);
    if (next.label !== undefined) set.label = next.label;
    if (next.active !== undefined) set.active = next.active;
    // Always keep kind + its companion field consistent.
    set.kind = finalKind;
    set.percent = finalKind === "percent_off" ? (finalPercent ?? null) : null;
    set.tier = finalKind === "grant_tier" ? (finalTier ?? null) : null;

    if (set.code && set.code !== current.code) {
      const clash = await db
        .select({ id: promoCodes.id })
        .from(promoCodes)
        .where(eq(promoCodes.code, set.code))
        .limit(1);
      if (clash.length > 0) {
        res.status(409).json({ error: "A code with that name already exists" });
        return;
      }
    }

    const updated = await db
      .update(promoCodes)
      .set(set)
      .where(eq(promoCodes.id, id))
      .returning();
    res.json(UpdatePromoCodeResponse.parse(toRecord(updated[0])));
  } catch (err) {
    req.log.error({ err }, "promo/codes: update failed");
    res.status(500).json({ error: "Failed to update promo code" });
  }
});

// ─── Admin: delete ───────────────────────────────────────────────────────────
router.delete("/promo/codes/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const deleted = await db
      .delete(promoCodes)
      .where(eq(promoCodes.id, id))
      .returning({ id: promoCodes.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    res.json(DeletePromoCodeResponse.parse({ ok: true }));
  } catch (err) {
    req.log.error({ err }, "promo/codes: delete failed");
    res.status(500).json({ error: "Failed to delete promo code" });
  }
});

export default router;
