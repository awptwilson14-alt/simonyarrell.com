import { Router, type IRouter } from "express";
import { StylistPlanBody, StylistPlanResponse } from "@workspace/api-zod";
type OpenAIClient =
  typeof import("@workspace/integrations-openai-ai-server")["openai"];

const router: IRouter = Router();

// Lazy + guarded OpenAI client. The integration module throws at import time
// when AI env vars are missing, which would crash the entire API server boot
// (including unrelated routes like /healthz) in any env without OpenAI
// provisioning. We import dynamically on first stylist request and return a
// graceful 503 if the integration isn't available.
let _openaiPromise: Promise<OpenAIClient | null> | null = null;
function loadOpenAI(): Promise<OpenAIClient | null> {
  if (_openaiPromise) return _openaiPromise;
  _openaiPromise = import("@workspace/integrations-openai-ai-server")
    .then((mod) => mod.openai)
    .catch(() => null);
  return _openaiPromise;
}

const SYSTEM_PROMPT = `You are the head stylist for Maison Simon (Simon Yarrell), a luxury fashion house known for haute couture restraint and editorial precision. You compose cohesive outfit PLANS — not raw text descriptions — that the app then resolves to real shoppable items from its curated catalog.

STRICT REQUIREMENTS (NEVER VIOLATE):
- Every look must be a COMPLETE, wearable outfit — never a partial outfit.
  • Men: 1 bottom (pants/jeans/trousers/sweatpants/shorts) + 1 top (t-shirt/polo/button-down/sweater/hoodie/knitwear) + 1 footwear. Outerwear when appropriate; a bag is recommended but, for men, ONLY a backpack, crossbody bag, briefcase, or duffel — NEVER a tote.
  • Women: 1 dress/jumpsuit OR (1 top + 1 bottom), PLUS 1 footwear, PLUS 1 handbag (REQUIRED — tote/crossbody/shoulder/clutch). Outerwear when appropriate.
- Always emit the required slots: men → at minimum a "top", a "bottom", and "shoes" slot; women → a "dress" (or a "top" AND a "bottom"), a "shoes", and a "bag" slot.
- All items must match the selected gender. Never mix masculine and feminine items in one look.
- All items must match the selected season. Never include wool/cashmere/parkas in Summer, never include linen/sundresses/sandals in Winter.
- Every piece must coordinate in color palette, silhouette, fabric, and formality.
- The outfit must read as professionally styled — a single coherent look, not a random assortment.
- Use only realistic, wearable combinations within the named luxury fashion houses (Loro Piana, The Row, Brunello Cucinelli, Hermès, Chanel, Valentino, Saint Laurent, Balenciaga, Bottega Veneta, Jacquemus, Toteme, Fear of God, Acne Studios, Stone Island, Acronym, etc.).
- Respect the user's budget tier when choosing brand prestige (under $500 → high street; $6000+ → couture).

NEVER include:
- Mixed gender items
- Conflicting seasonal wear
- Random unrelated accessories
- Mismatched footwear (e.g. dress oxford with athletic shorts)
- Duplicate layering (two coats, two hats)
- Unrealistic combinations

Return ONLY valid JSON conforming to the schema. No prose, no markdown fences.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    style: { type: "string", description: "Dominant aesthetic, e.g. Old Money, Luxury Streetwear, Vacation Luxe, Techwear, Clean Minimal, Y2K Revival, Business, Evening, Formal, Avant-garde" },
    palette: { type: "string", description: "Palette name, e.g. Champagne & Ivory, Midnight & Gold" },
    paletteColors: { type: "array", items: { type: "string", description: "CSS hex color, format #RRGGBB" }, minItems: 2, maxItems: 5 },
    season: { type: "string", enum: ["Spring", "Summer", "Autumn", "Winter", "All Season"] },
    name: { type: "string", description: "Editorial look name, max 4 words" },
    description: { type: "string", description: "Two short sentences, editorial voice" },
    slots: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessories", "jewelry"] },
          descriptor: { type: "string", description: "One short editorial phrase, e.g. 'fluid silk-jersey column dress'" },
          brandPreferences: { type: "array", items: { type: "string" }, maxItems: 5 },
          colorPreferences: { type: "array", items: { type: "string" }, maxItems: 4 },
          formality: { type: "string", enum: ["casual", "smart", "dress"] },
        },
        required: ["category", "descriptor", "brandPreferences", "colorPreferences", "formality"],
      },
    },
  },
  required: ["style", "palette", "paletteColors", "season", "name", "description", "slots"],
} as const;

router.post("/stylist/plan", async (req, res) => {
  const parsed = StylistPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { gender, occasion, budget, season, prompt, favoriteStyles } = parsed.data;

  const userMessage = [
    `Compose ONE luxury outfit plan with the following constraints:`,
    `- Gender: ${gender}`,
    `- Occasion: ${occasion}`,
    `- Budget tier: ${budget}`,
    season ? `- Season: ${season} (HARD constraint — every clothing/shoe piece must be season-appropriate)` : `- Season: dealer's choice`,
    favoriteStyles && favoriteStyles.length > 0 ? `- Favorite styles to lean into: ${favoriteStyles.join(", ")}` : null,
    prompt && prompt.trim() ? `- Additional brief: ${prompt.trim()}` : null,
    ``,
    `Return a JSON object with: style, palette, paletteColors[], season, name, description, slots[].`,
    `paletteColors MUST be 3-5 valid CSS hex codes in #RRGGBB format (e.g. "#C6A75E", "#0B0B0C") — never color names. These render as visual swatches in the app.`,
    `Each slot needs: category, descriptor, brandPreferences[] (luxury houses in priority), colorPreferences[], formality.`,
    `3-6 slots total. Build a COMPLETE outfit — never partial. ${gender.toLowerCase() === "women" ? "Women MUST have: (dress) OR (top + bottom), PLUS shoes, PLUS a bag (handbag is required)." : "Men MUST have: top + bottom + shoes (outerwear optional, bag recommended)."}`,
  ].filter(Boolean).join("\n");

  const openai = await loadOpenAI();
  if (!openai) {
    req.log.warn("stylist: OpenAI integration not provisioned");
    res.status(503).json({ error: "AI stylist is not configured on this server" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "stylist_plan",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      req.log.error({ completion }, "stylist: empty completion content");
      res.status(502).json({ error: "Empty response from AI" });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      req.log.error({ err, raw }, "stylist: failed to parse JSON");
      res.status(502).json({ error: "AI returned invalid JSON" });
      return;
    }

    const planResult = StylistPlanResponse.safeParse(parsedJson);
    if (!planResult.success) {
      req.log.error({ issues: planResult.error.flatten(), parsedJson }, "stylist: plan failed validation");
      res.status(502).json({ error: "AI plan failed schema validation" });
      return;
    }

    res.json(planResult.data);
  } catch (err) {
    req.log.error({ err }, "stylist: upstream error");
    res.status(502).json({ error: "Upstream AI provider error" });
  }
});

export default router;
