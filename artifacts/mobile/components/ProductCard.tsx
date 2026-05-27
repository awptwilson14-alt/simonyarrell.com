import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { openExternalUrl } from "@/lib/openExternal";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";

import { ResilientImage } from "@/components/ResilientImage";
import { Product } from "@/constants/data";
import { findCelebByName } from "@/lib/celebLookup";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useShopBrandHandoff } from "@/hooks/useShopBrandHandoff";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { isProductSaved, saveProduct, unsaveProduct, findLook } = useApp();
  const saved = isProductSaved(product.id);
  // Brand-tap → shop brand drawer (batch 65 — 4th/5th/6th surfaces in the
  // closet→shop signals track via the single shared ProductCard render path
  // used by profile saved products, shop iconChanneled rail, and shop main
  // grid). Gated on brandCatalog membership: canonical brands link with a
  // chevron cue, collabs/variants render plain (no false affordance). Shop
  // brand drawer renders products inline (not via ProductCard), so no
  // tap-into-the-same-brand no-op risk; no opt-out prop needed.
  const { brandCatalog, goShopBrand } = useShopBrandHandoff();
  const brandLinkable = brandCatalog.has(product.brand.toLowerCase());

  // Resolve back-references staged in batch 31. Both are optional — when
  // the product was saved from a non-celeb generic catalog source, both
  // resolve to undefined and the card stays non-tappable (preserves the
  // existing pre-batch-31 behavior for unattributed saves).
  const sourceLook = product.lookId ? findLook(product.lookId) : undefined;
  const linkedCeleb = product.inspiredBy
    ? findCelebByName(product.inspiredBy)
    : undefined;

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (saved) unsaveProduct(product.id);
    else saveProduct(product);
  };

  const openShop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openExternalUrl(product.purchaseUrl);
  };

  const openSourceLook = () => {
    if (!sourceLook) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/look/${sourceLook.id}`);
  };

  const openLinkedCeleb = () => {
    if (!linkedCeleb) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/celebrity/${linkedCeleb.id}`);
  };

  return (
    <Pressable
      onPress={sourceLook ? openSourceLook : undefined}
      disabled={!sourceLook}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed && sourceLook ? 0.9 : 1,
        },
      ]}
    >
      {/* ── Product Image (with editorial brand-monogram fallback) ── */}
      <View style={[styles.imageWrapper, { backgroundColor: colors.secondary }]}>
        <ResilientImage
          uri={product.imageUrl}
          localSource={product.localImage}
          style={styles.image}
          brand={product.brand}
          category={product.category}
          size="lg"
          transition={300}
        />
        {/* Top scrim — mirrors batch 113's LookCard bottom scrim, but at the
            top edge since this card's overlay (tierBadge) sits top-left.
            Only the top 40% of the image gets a subtle dark wash so the
            tier badge always reads cleanly regardless of underlying product
            pixels (cream handbag → previously washed out the chip text).
            pointerEvents:'none' so the badge stays non-blocking. */}
        <LinearGradient
          colors={["rgba(0,0,0,0.4)", "transparent"]}
          locations={[0, 0.4]}
          style={styles.topScrim}
          pointerEvents="none"
        />
        {/* Tier badge */}
        <View style={[styles.tierBadge, { backgroundColor: "rgba(11,11,12,0.72)" }]}>
          <Text style={[styles.tierBadgeText, { color: tierColor(product.price) }]}>
            {tierLabel(product.price)}
          </Text>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          {brandLinkable ? (
            // Nested Pressable inside the outer card Pressable — same proven
            // pattern as the heart-toggle and BUY NOW buttons in this card.
            // hitSlop kept tight (6) so the outer card tap (→ sourceLook
            // when present) still dominates most of the card surface.
            <Pressable
              onPress={() => goShopBrand(product.brand)}
              hitSlop={6}
              style={({ pressed }) => [styles.brandLinkRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.brand, { color: colors.gold, flex: 1 }]} numberOfLines={1}>
                {product.brand.toUpperCase()}
              </Text>
              <Feather name="chevron-right" size={11} color={colors.gold} />
            </Pressable>
          ) : (
            <Text style={[styles.brand, { color: colors.gold, flex: 1, marginRight: 8 }]} numberOfLines={1}>
              {product.brand.toUpperCase()}
            </Text>
          )}
          {/* Filled heart on save (batch 113 parity) — Feather has no
              filled-heart glyph, so the prior color-only diff was weak.
              Saved → FontAwesome solid heart in gold; unsaved → outlined
              Feather heart in muted. Size kept identical (15) since the
              inline brand-row context can't tolerate any vertical jitter. */}
          <Pressable onPress={toggleSave} hitSlop={12}>
            {saved ? (
              <FontAwesome name="heart" size={14} color={colors.gold} />
            ) : (
              <Feather name="heart" size={15} color={colors.mutedForeground} />
            )}
          </Pressable>
        </View>

        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Celeb attribution carries over from the parent Look (batch 31).
            Only shown when the piece was saved from a celeb-inspired
            generation — generic catalog/shop saves stay clean. */}
        {product.inspiredBy && (
          // Pressable when the name resolves to a CELEBS entry — same
          // pattern as Look detail INSPIRED BY pill (batch 26). Falls back
          // to a non-interactive label when unresolved (legacy data).
          // Inner Pressable swallows the gesture so the outer card tap
          // (→ source look) is not also triggered.
          linkedCeleb ? (
            <Pressable
              onPress={openLinkedCeleb}
              hitSlop={6}
              style={[styles.inspiredChip, { borderColor: linkedCeleb.accentColor, backgroundColor: linkedCeleb.accentColor + "18" }]}
            >
              <Feather name="star" size={9} color={linkedCeleb.accentColor} />
              <Text style={[styles.inspiredText, { color: linkedCeleb.accentColor }]} numberOfLines={1}>
                INSPIRED BY {product.inspiredBy.toUpperCase()}
              </Text>
              <Feather name="chevron-right" size={9} color={linkedCeleb.accentColor} />
            </Pressable>
          ) : (
            <View style={[styles.inspiredChip, { borderColor: colors.gold, backgroundColor: colors.gold + "18" }]}>
              <Feather name="star" size={9} color={colors.gold} />
              <Text style={[styles.inspiredText, { color: colors.gold }]} numberOfLines={1}>
                INSPIRED BY {product.inspiredBy.toUpperCase()}
              </Text>
            </View>
          )
        )}

        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {product.description}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>
            ${product.price.toLocaleString()}
          </Text>
          <Pressable
            onPress={openShop}
            style={[styles.shopBtn, { backgroundColor: colors.gold }]}
          >
            <Feather name="external-link" size={11} color="#0B0B0C" />
            <Text style={styles.shopText}>BUY NOW</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function tierLabel(price: number): string {
  if (price >= 3000) return "ULTRA LUXURY";
  if (price >= 1000) return "LUXURY";
  if (price >= 400) return "PREMIUM";
  if (price >= 100) return "CONTEMPORARY";
  return "FAST FASHION";
}

function tierColor(price: number): string {
  if (price >= 3000) return "#C6A75E";
  if (price >= 1000) return "#B8A898";
  if (price >= 400) return "#8E9EAB";
  if (price >= 100) return "#7A8C6E";
  return "#9E7A8C";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderWidth: 0.5,
    overflow: "hidden",
    marginBottom: 14,
  },
  imageWrapper: {
    height: 220,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tierBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  tierBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  info: {
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    // flex:1 + marginRight:8 moved inline so the linkable branch can carry
    // them on its Pressable wrapper instead, while the non-linkable Text
    // branch carries them directly — both branches preserve the original
    // truncation + heart-spacing behavior.
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  brandLinkRow: {
    flex: 1,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
    lineHeight: 21,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.2,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
  },
  shopText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  inspiredChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 0.5,
    marginTop: 2,
  },
  inspiredText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
});
