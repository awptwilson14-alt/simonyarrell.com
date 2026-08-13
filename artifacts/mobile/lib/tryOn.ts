import { API_BASE } from "./apiBase";
/**
 * Virtual try-on client — calls POST /api/tryon/compose, which composites the
 * user's photo with the garment images of a look via Gemini image generation
 * and returns a photorealistic image of the user wearing the outfit.
 */



export type PersonMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface TryOnRequest {
  /** Base64-encoded person photo, WITHOUT the `data:...;base64,` prefix. */
  personImage: string;
  personMimeType: PersonMimeType;
  /** Remote image URLs of the garments, in layering order (max 6). */
  garmentImageUrls: string[];
  lookName?: string;
  gender?: "Women" | "Men" | "Unisex";
  notes?: string;
}

export interface TryOnResult {
  /** Base64 generated image, WITHOUT the data-url prefix. */
  image: string;
  mimeType: string;
  /** Ready-to-render data URL. */
  dataUri: string;
}

export class TryOnError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TryOnError";
  }
}

export async function composeTryOn(req: TryOnRequest): Promise<TryOnResult> {
  const url = `${API_BASE}/api/tryon/compose`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch (err) {
    throw new TryOnError(
      `Could not reach the try-on studio (${err instanceof Error ? err.message : "network error"})`,
    );
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new TryOnError(detail || `Try-on studio returned ${res.status}`, res.status);
  }
  const body = (await res.json()) as { image: string; mimeType: string };
  return {
    image: body.image,
    mimeType: body.mimeType,
    dataUri: `data:${body.mimeType};base64,${body.image}`,
  };
}
