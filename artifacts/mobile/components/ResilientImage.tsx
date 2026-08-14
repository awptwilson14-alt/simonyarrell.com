import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { isBadUnsId } from "@/constants/badImageIds";
import { apiUrl } from "@/lib/affiliateTracking";

/**
 * Render-time denylist gate (batch 74). Extracts the Unsplash photo ID from
 * any incoming URI and consults `isBadUnsId` — if the ID is in the visual
 * denylist, the photo is suppressed and the editorial fallback tile renders
 * instead. This protects against the failure mode where a saved snapshot
 * (e.g. `savedProducts` persisted to AsyncStorage before the ID was added
 * to the denylist) keeps showing the wrong/decayed image even after the
 * source-side `uns()` gate has been updated. Same regex shape as `uns()`
 * in `lib/outfitEngine.ts`.
 */
const UNSPLASH_PHOTO_RE = /images\.unsplash\.com\/photo-([0-9a-zA-Z_-]+)/;
function extractUnsplashId(uri?: string): string | null {
  if (!uri) return null;
  const m = uri.match(UNSPLASH_PHOTO_RE);
  return m ? m[1] : null;
}

/**
 * Editorial fallback image used everywhere a hotlinked CDN photo can fail
 * or be denylisted (see `constants/badImageIds.ts`). Renders a luxury tile
 * — brand monogram in PlayfairDisplay gold + category icon + color swatch
 * dot — so the cell reads as "intentional, no-photo presentation" rather
 * than a missing-image error. Used by look detail and ProductCard so the
 * fallback styling stays identical across surfaces.
 */

export function categoryIcon(cat?: string): React.ComponentProps<typeof Feather>["name"] {
  switch ((cat ?? "").toLowerCase()) {
    case "dress":      return "feather";
    case "top":        return "user";
    case "bottom":     return "minus";
    case "outerwear":  return "shield";
    case "shoes":      return "navigation";
    case "bag":        return "shopping-bag";
    case "jewelry":    return "star";
    case "accessories":return "circle";
    default:           return "tag";
  }
}

const BRAND_SKIP_WORDS = new Set(["the", "x", "&", "and", "by", "de"]);

export function brandMonogram(brand?: string): string {
  if (!brand) return "·";
  const words = brand
    .replace(/[^\w\s&]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !BRAND_SKIP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return brand.charAt(0).toUpperCase();
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#0B0B0C", white: "#F5F5F0", ivory: "#F2EBDD", cream: "#EFE6D2",
  natural: "#D9CDB4", stone: "#C9BFAE", beige: "#D6C6A8", sand: "#D2BE96",
  camel: "#B48455", tan: "#A8794D", brown: "#6B4A2B", chocolate: "#3E2A1A",
  cognac: "#8B4A2B", chestnut: "#6E3B1F", taupe: "#8E7E69",
  grey: "#9CA3AF", gray: "#9CA3AF", charcoal: "#2D2F33", silver: "#C4C8CE",
  navy: "#13213C", blue: "#2B4D7F", denim: "#3F5C82", indigo: "#1F2F58",
  red: "#9E2A2B", burgundy: "#5B1A1A", wine: "#5B1A1A", crimson: "#8B1A22",
  pink: "#E6BCC6", rose: "#C58994", blush: "#E6C9C2",
  green: "#3F5B3B", olive: "#5A5A2E", sage: "#A7B197", forest: "#2A3F2A",
  yellow: "#D9B14A", mustard: "#B58A2E",
  orange: "#C4642B", rust: "#9A4A24",
  purple: "#5A3D6B", lavender: "#BFB1D0",
  gold: "#C6A75E", bronze: "#9A7C38", nude: "#D9BFA8",
};

export function colorNameToHex(name?: string, fallback = "#6B7280"): string {
  if (!name) return fallback;
  const key = name.trim().toLowerCase().replace(/[-_/]/g, " ");
  if (COLOR_NAME_TO_HEX[key]) return COLOR_NAME_TO_HEX[key];
  const parts = key.split(/\s+/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (COLOR_NAME_TO_HEX[parts[i]]) return COLOR_NAME_TO_HEX[parts[i]];
  }
  return fallback;
}

export interface ResilientImageProps {
  uri?: string;
  /** Bundled local asset (output of `require("...png")`). Takes precedence
   *  over `uri` when set — used for AI-generated catalog product images
   *  shipped in the app bundle (e.g. d001 column gown). */
  localSource?: number;
  // Loose type: the same dimensions object is passed straight through to
  // either a View (fallback) or an expo-image element. Splitting these into
  // separate strict StyleProp generics doesn't compose cleanly across both.
  style: any;
  fallbackColor?: string;
  transition?: number;
  brand?: string;
  category?: string;
  color?: string;
  /** Item name (e.g. "Crystal Mini Skirt"). When set and no real product
   *  image is available, the thumbnail loads a server-side AI-generated
   *  product photo (GET /api/item-image — generated once per unique item,
   *  cached forever). The monogram tile still renders while loading and
   *  remains the fallback if generation fails. */
  name?: string;
  /** Scale the monogram + icon for larger tiles (e.g. ProductCard hero). */
  size?: "sm" | "md" | "lg";
  /** Notifies the parent whenever the RUNTIME-resolved image URI changes
   *  (e.g. real retailer photo failed → switched to the AI product shot).
   *  Zoom/lightbox wrappers should use this so they enlarge exactly what
   *  the thumbnail is showing. Reports undefined when only the monogram
   *  fallback is visible. */
  onEffectiveUriChange?: (uri: string | undefined) => void;
}

/** Absolute URL of the AI-generated product photo for an item. Exported so
 *  zoom/lightbox wrappers can show the same image the thumbnail resolved. */
export function generatedItemImageUri(
  brand?: string,
  name?: string,
  category?: string,
  color?: string,
): string | undefined {
  if (!brand || !name) return undefined;
  const qs = new URLSearchParams({ brand, name });
  if (category) qs.set("category", category);
  if (color) qs.set("color", color);
  const base = apiUrl(`/api/item-image?${qs.toString()}`);
  // apiUrl returns a relative path when no API base is configured — expo-image
  // needs an absolute URL, so treat that case as "no generated image".
  return base.startsWith("http") ? base : undefined;
}

/** Shared effective-URI resolver — the SAME logic ResilientImage uses, so
 *  zoom/lightbox wrappers always show exactly what the thumbnail resolved:
 *  real URI (unless denylisted) → AI-generated product photo → undefined. */
export function resolveEffectiveImageUri(
  uri: string | undefined,
  brand?: string,
  name?: string,
  category?: string,
  color?: string,
): string | undefined {
  const id = extractUnsplashId(uri);
  const denylisted = id ? isBadUnsId(id) : false;
  if (uri && !denylisted) return uri;
  return generatedItemImageUri(brand, name, category, color);
}

export function ResilientImage({
  uri,
  localSource,
  style,
  fallbackColor = "#6B7280",
  transition = 250,
  brand,
  category,
  color,
  name,
  size = "sm",
  onEffectiveUriChange,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);
  // When the REAL retailer image errors, we don't give up — we fall through
  // to the server-side AI-generated product shot (owner rule: every piece
  // shows a clothing photo; the monogram tile is a loading state only).
  const [realUriFailed, setRealUriFailed] = useState(false);
  // Bounded retry of the generated-image endpoint: the server 404s while
  // generation is rate-limited/in-flight or when a paid generation fails,
  // so retrying with backoff usually succeeds a few seconds later. The
  // `retry` counter is appended as a cache-buster so the image layer
  // re-fetches instead of replaying the cached 404.
  const [retry, setRetry] = useState(0);
  // `loaded` flips true only when expo-image actually reports a successful
  // load (not just onLoadEnd, which fires on errors too). Until then the
  // editorial fallback tile underneath stays visible — fixes the case where
  // hotlink-protected retailer CDNs (eBay, modesens, etc.) return an opaque
  // / blank response that never triggers onError, leaving the thumbnail
  // permanently empty. See batch 133.
  const [loaded, setLoaded] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const clearRetryTimer = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearRetryTimer();
    };
  }, []);

  // Reset ALL failure/retry state when the item identity changes — list rows
  // are recycled, and stale `failed`/`realUriFailed`/`retry` from a previous
  // product must never suppress the new product's image.
  const identity = `${uri ?? ""}|${localSource ?? ""}|${brand ?? ""}|${name ?? ""}|${category ?? ""}|${color ?? ""}`;
  const prevIdentity = useRef(identity);
  if (prevIdentity.current !== identity) {
    prevIdentity.current = identity;
    clearRetryTimer();
    setFailed(false);
    setRealUriFailed(false);
    setRetry(0);
    setLoaded(false);
  }
  // Render-time visual-denylist check — see header comment. Stale AsyncStorage
  // saves (e.g. savedProducts captured before an ID joined the denylist) still
  // ship the decayed URL to this component; pulling the ID out of the URI and
  // re-running isBadUnsId here forces the editorial fallback no matter where
  // the URI came from.
  const denylisted = (() => {
    const id = extractUnsplashId(uri);
    return id ? isBadUnsId(id) : false;
  })();

  // No real product image? Fall through to the server-side AI-generated
  // product photo (generated once per unique item, cached forever). The
  // monogram tile still renders underneath while it loads and remains the
  // final fallback if the endpoint 404s (generation failed / server down).
  const generatedUri = generatedItemImageUri(brand, name, category, color);
  const resolvedUri = localSource
    ? uri
    : resolveEffectiveImageUri(uri, brand, name, category, color);
  // Real retailer URI failed to load? Fall through to the AI product shot.
  const usingGenerated =
    !localSource &&
    !!generatedUri &&
    (resolvedUri === generatedUri || (realUriFailed && !!resolvedUri));
  const baseUri = usingGenerated ? generatedUri : resolvedUri;
  // Cache-bust generated-image retries so a previously cached 404 response
  // isn't replayed by the image layer.
  const effectiveUri =
    usingGenerated && retry > 0
      ? `${baseUri}${baseUri!.includes("?") ? "&" : "?"}r=${retry}`
      : baseUri;

  const MAX_GENERATED_RETRIES = 6;
  const handleError = () => {
    if (localSource) {
      setFailed(true);
      return;
    }
    // A real product photo failed → switch to the generated shot (if any).
    if (!usingGenerated && generatedUri) {
      setLoaded(false);
      setRealUriFailed(true);
      return;
    }
    // Generated shot failed → retry with backoff; the server may just be
    // rate-limited or mid-generation. Give up (monogram) only after the cap.
    if (usingGenerated && retry < MAX_GENERATED_RETRIES) {
      // Single pending timer at most: a burst of error events must not stack
      // callbacks (that would blow past the retry cap and leak timers).
      if (retryTimer.current) return;
      const delay = Math.min(2000 * 2 ** retry, 15000);
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        if (mounted.current) setRetry((r) => r + 1);
      }, delay);
      return;
    }
    setFailed(true);
  };

  // effectiveUri already excludes denylisted URIs (they were swapped for the
  // generated photo or undefined above), so no further denylist check here.
  const hasImage = !!(localSource || effectiveUri);
  const showOverlay = hasImage && !failed;

  // Keep zoom/lightbox owners in sync with the RUNTIME-resolved image (which
  // can change after mount when a real photo fails → generated shot). Report
  // the stable base URI (no cache-buster); undefined when only the monogram
  // renders. localSource callers pass their own asset, so skip them.
  const reportedUri = failed || localSource ? undefined : baseUri;
  useEffect(() => {
    onEffectiveUriChange?.(reportedUri);
    // Intentionally NOT keyed on the callback identity — parents pass inline
    // lambdas; re-notifying on every parent render would loop their state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportedUri]);

  const monoSize = size === "lg" ? 44 : size === "md" ? 28 : 20;
  const iconSize = size === "lg" ? 18 : size === "md" ? 12 : 9;
  const dotSize  = size === "lg" ? 12 : size === "md" ? 8  : 6;

  // Editorial fallback tile — always rendered as the base layer so even
  // when the overlay image is mid-load or silently fails we never present
  // an empty square. The image, when it does succeed, sits on top with
  // contentFit:cover and visually replaces the tile.
  const fallback = (
    <View
      style={[
        style,
        {
          backgroundColor: "#15151A",
          borderWidth: 0.5,
          borderColor: "rgba(198,167,94,0.25)",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        },
      ]}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_700Bold",
          fontSize: monoSize,
          color: "#C6A75E",
          letterSpacing: 0.5,
        }}
        numberOfLines={1}
      >
        {brandMonogram(brand)}
      </Text>
      <Feather
        name={categoryIcon(category)}
        size={iconSize}
        color="rgba(245,245,240,0.55)"
        style={{ marginTop: size === "lg" ? 6 : 2 }}
      />
      {color ? (
        <View
          style={{
            position: "absolute",
            bottom: size === "lg" ? 8 : 4,
            right: size === "lg" ? 8 : 4,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: colorNameToHex(color, fallbackColor),
            borderWidth: 0.5,
            borderColor: "rgba(245,245,240,0.35)",
          }}
        />
      ) : null}
    </View>
  );

  if (!showOverlay) {
    return fallback;
  }

  // Image overlay sits on top of the fallback. `opacity:0` until the load
  // event fires successfully — so a CDN that silently returns blank keeps
  // the editorial tile visible underneath instead of revealing an empty
  // overlay. Once `loaded` flips true, the overlay covers the tile.
  return (
    <View style={[style, { position: "relative", overflow: "hidden" }]}>
      {fallback}
      <Image
        source={localSource ? localSource : { uri: effectiveUri! }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: loaded ? 1 : 0,
        }}
        contentFit="cover"
        transition={transition}
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </View>
  );
}
