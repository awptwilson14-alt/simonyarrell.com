import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

import { BRANDS } from "@/constants/brands";

/**
 * Shared closet→shop / look→shop / celebrity→shop brand handoff.
 *
 * Returns:
 *  - `brandCatalog`: lowercased Set of canonical BRANDS names for O(1)
 *    case-insensitive membership checks. Callers iterating over user- or
 *    catalog-supplied brand strings (look pieces, celebrity signatureBrands)
 *    should gate the tappable affordance behind this — collabs/variants
 *    like "Nike x Off-White" or "Ralph Lauren Purple Label" won't match
 *    and should render as plain text rather than a broken affordance.
 *    Callers passing a single trusted user signal (closet WARDROBE
 *    SIGNATURE most-worn brand) may skip the gate — shop.tsx handles
 *    misses silently.
 *  - `goShopBrand(name)`: Light haptic + router.push to /(tabs)/shop with
 *    the brand param. Consumed by shop.tsx's useEffect which sets
 *    mainTab='brands', the matching tier, and expands the brand card via
 *    setExpandedBrand(match.id). Same params shape across all callers.
 *
 * Light haptic matches the editorial-tap vocabulary (Medium reserved for
 * committed personalized actions).
 */
export function useShopBrandHandoff() {
  const router = useRouter();
  const brandCatalog = useMemo(
    () => new Set(BRANDS.map((b) => b.name.toLowerCase())),
    []
  );
  const goShopBrand = useCallback(
    (b: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/(tabs)/shop", params: { brand: b } });
    },
    [router]
  );
  return { brandCatalog, goShopBrand };
}
