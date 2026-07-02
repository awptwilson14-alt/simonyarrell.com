import dns from "node:dns/promises";
import net from "node:net";
import { Router, type IRouter } from "express";
import { TryOnComposeBody } from "@workspace/api-zod";

// Lazy + guarded Gemini client. The integration module throws at import time
// when the AI env vars are missing, which would crash the whole API server
// boot (including unrelated routes). We import dynamically on first try-on
// request and return a graceful 503 if the integration isn't available.
type GeminiModule = typeof import("@workspace/integrations-gemini-ai");
let _geminiPromise: Promise<GeminiModule | null> | null = null;
function loadGemini(): Promise<GeminiModule | null> {
  if (_geminiPromise) return _geminiPromise;
  _geminiPromise = import("@workspace/integrations-gemini-ai").catch(() => null);
  return _geminiPromise;
}

const router: IRouter = Router();

const TRYON_MODEL = "gemini-2.5-flash-image";
const MAX_GARMENT_BYTES = 6 * 1024 * 1024; // 6MB per garment image
const FETCH_TIMEOUT_MS = 12_000;

interface InlineImage {
  data: string; // base64, no data-url prefix
  mimeType: string;
}

// ── SSRF protection ──────────────────────────────────────────────────
// Garment URLs are client-supplied, so before the server fetches them we
// must reject anything that could reach internal infrastructure (loopback,
// link-local, RFC1918/ULA, cloud metadata endpoints, non-https schemes).

function ipv4ToLong(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipv4InRange(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToLong(ip) & mask) === (ipv4ToLong(base) & mask);
}

function isPrivateIPv4(ip: string): boolean {
  const ranges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10], // CGNAT
    ["127.0.0.0", 8], // loopback
    ["169.254.0.0", 16], // link-local (incl. cloud metadata 169.254.169.254)
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["255.255.255.255", 32],
  ];
  return ranges.some(([base, bits]) => ipv4InRange(ip, base, bits));
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
    if (lower.startsWith("fe80")) return true; // link-local
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return false;
  }
  return true; // not a valid IP literal → treat as unsafe
}

/** Throws when the URL isn't a public https image endpoint. */
async function assertPublicHttpsUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid url");
  }
  if (url.protocol !== "https:") throw new Error("scheme not allowed");
  const host = url.hostname;
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("private address");
    return;
  }
  const resolved = await dns.lookup(host, { all: true });
  if (resolved.length === 0) throw new Error("dns resolution failed");
  for (const addr of resolved) {
    if (isPrivateIp(addr.address)) throw new Error("private address");
  }
}

/** Fetch a remote garment image and return it as base64 inline data. */
async function fetchGarmentImage(url: string): Promise<InlineImage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    await assertPublicHttpsUrl(url);
    // redirect: "error" closes the redirect-based SSRF vector — a public URL
    // can't 3xx-bounce to an internal host. Curated catalog images are direct
    // CDN links, so this doesn't cost us legitimate garments.
    const res = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_GARMENT_BYTES) return null;
    return { data: buf.toString("base64"), mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildInstruction(
  gender: string | undefined,
  lookName: string | undefined,
  garmentCount: number,
  notes: string | undefined,
): string {
  const subject =
    gender === "Men" ? "man" : gender === "Women" ? "woman" : "person";
  return [
    `You are a high-end fashion virtual try-on engine.`,
    `The FIRST image is a real photo of a ${subject}. The following ${garmentCount} image(s) are individual garments/accessories.`,
    `Generate a single photorealistic, editorial full-body image of the SAME ${subject} from the first photo wearing ALL of the provided garments together as one complete, coordinated outfit${lookName ? ` (the "${lookName}" look)` : ""}.`,
    `Critical requirements:`,
    `- Preserve the person's exact face, hair, skin tone, body proportions and identity from the first photo — do not change who they are.`,
    `- Fit each garment naturally to their body: realistic drape, folds, fabric weight, seams and correct sizing for their proportions.`,
    `- Match lighting, shadows and perspective so every garment looks physically worn, not pasted on.`,
    `- Keep colors, patterns and materials of the garments faithful to the product images.`,
    `- Produce a clean, luxury fashion-editorial result on a simple, uncluttered background. Full body, head-to-toe, so the shoes are visible.`,
    notes && notes.trim() ? `- Additional styling note: ${notes.trim()}` : null,
    `Output only the final composited image.`,
  ]
    .filter(Boolean)
    .join("\n");
}

router.post("/tryon/compose", async (req, res) => {
  const parsed = TryOnComposeBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { personImage, personMimeType, garmentImageUrls, lookName, gender, notes } =
    parsed.data;

  const gemini = await loadGemini();
  if (!gemini) {
    req.log.warn("tryon: Gemini integration not provisioned");
    res.status(503).json({ error: "AI try-on is not configured on this server" });
    return;
  }
  const { ai, Modality } = gemini;

  // Fetch all garment images concurrently. Fail CLOSED: if any piece can't be
  // loaded we refuse rather than silently rendering an incomplete outfit — a
  // try-on that quietly drops selected garments erodes trust in the result.
  const fetched = await Promise.all(garmentImageUrls.map(fetchGarmentImage));
  const garments = fetched.filter((g): g is InlineImage => g !== null);
  if (garments.length !== garmentImageUrls.length) {
    req.log.warn(
      { requested: garmentImageUrls.length, loaded: garments.length },
      "tryon: not all garment images could be fetched",
    );
    res.status(502).json({
      error:
        garments.length === 0
          ? "Could not load the garment images for this look"
          : "Could not load every piece in this look — please try another",
    });
    return;
  }

  const parts: Array<
    | { inlineData: { data: string; mimeType: string } }
    | { text: string }
  > = [
    { inlineData: { data: personImage, mimeType: personMimeType } },
    ...garments.map((g) => ({ inlineData: { data: g.data, mimeType: g.mimeType } })),
    { text: buildInstruction(gender, lookName, garments.length, notes) },
  ];

  try {
    const response = await ai.models.generateContent({
      model: TRYON_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        // TEXT + IMAGE modalities: the image model may emit a short text part
        // alongside the generated image; we only keep the image part.
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = candidateParts.find(
      (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data,
    );

    if (!imagePart?.inlineData?.data) {
      req.log.error("tryon: no image in Gemini response");
      res.status(502).json({ error: "The try-on engine did not return an image" });
      return;
    }

    res.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
    });
  } catch (err) {
    req.log.error({ err }, "tryon: upstream error");
    res.status(502).json({ error: "Upstream AI provider error" });
  }
});

export default router;
