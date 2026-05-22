import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image as RNImage,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { GoldButton } from "@/components/GoldButton";
import { LookCard } from "@/components/LookCard";
import { ResilientImage } from "@/components/ResilientImage";
import { LOOKS, TRENDS } from "@/constants/data";
import { useShopBrandHandoff } from "@/hooks/useShopBrandHandoff";
import { findCelebByName } from "@/lib/celebLookup";
import { pickLookHero, pickStyleHero } from "@/constants/heroImages";
import { hasNamedLookImageForStyle, assignUniqueLookImages, getSignatureBrands } from "@/lib/outfitEngine";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import type { Look } from "@/constants/data";

const { width, height } = Dimensions.get("window");

type PanelView = "details" | "shop";

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLookSaved, saveLook, unsaveLook, saveProduct, isProductSaved, findLook, userProfile, savedLooks } = useApp();
  const [panel, setPanel] = useState<PanelView>("details");

  const look = findLook(id ?? "");
  // Look-detail piece brands tap → shop brand drawer (batch 63 → batch 64
  // extracted to shared hook so closet, look, and celebrity all share one
  // contract). brandCatalog gates the affordance — look pieces include
  // collabs/variants ("Nike x Off-White", "Ralph Lauren Purple Label") that
  // intentionally won't match BRANDS canonical names and render plain.
  const { brandCatalog, goShopBrand } = useShopBrandHandoff();
  // Context-aware related strip with a four-tier waterfall:
  //   1. SAME ICON (savedLooks) — when the current look has inspiredBy, other
  //      saved looks channeling the same celeb are the strongest "more like
  //      this" signal. Drawn from live user state, not the static catalog.
  //   2. Same style (LOOKS catalog).
  //   3. Same occasion (LOOKS catalog).
  //   4. Anything else (LOOKS catalog).
  // Set-keyed dedupe keeps the fill stable across tier overlaps and prevents
  // a savedLook from re-appearing if it also lives in LOOKS.
  // `relatedDrivenByCeleb` reflects whether tier-1 contributed anything, so
  // the section header can switch to "More from {Icon}" only when celeb is
  // actually the driver — never mislabel a pure style-tier rail.
  const { allRelated, relatedDrivenByCeleb } = (() => {
    if (!look) return { allRelated: LOOKS.slice(0, 3), relatedDrivenByCeleb: false };
    const picked: Look[] = [];
    const seen = new Set<string>([id ?? ""]);
    const take = (source: Look[], predicate: (l: Look) => boolean) => {
      for (const l of source) {
        if (picked.length >= 3) return;
        if (seen.has(l.id)) continue;
        if (!predicate(l)) continue;
        picked.push(l);
        seen.add(l.id);
      }
    };
    let celebDriven = false;
    if (look.inspiredBy) {
      const before = picked.length;
      // savedLooks first (recency-ordered live user history), then the static
      // catalog (only the few LOOKS that carry inspiredBy will match). Two
      // passes via the same `take` helper share the seen-set so a savedLook
      // and its catalog twin can't double-fill.
      take(savedLooks, (l) => l.inspiredBy === look.inspiredBy);
      take(LOOKS, (l) => l.inspiredBy === look.inspiredBy);
      if (picked.length > before) celebDriven = true;
    }
    take(LOOKS, (l) => l.style === look.style);
    take(LOOKS, (l) => l.occasion === look.occasion);
    take(LOOKS, () => true);
    return { allRelated: picked, relatedDrivenByCeleb: celebDriven };
  })();

  if (!look) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_600SemiBold" }]}>Look not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isLookSaved(look.id);

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) unsaveLook(look.id);
    else saveLook(look);
  };

  const shopAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    look.pieces.forEach((piece) => {
      if (piece.purchaseUrl) {
        setTimeout(() => Linking.openURL(piece.purchaseUrl!).catch(() => {}), 200);
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Hero ── */}
        <View style={styles.heroContainer}>
          <RNImage source={hasNamedLookImageForStyle(look.name, look.style) ? look.image : (pickStyleHero(look.style, userProfile.gender, look.id) ?? pickLookHero(look.name, userProfile.gender, look.id) ?? look.image)} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(11,11,12,0.6)", "transparent", "transparent", "#0B0B0C"]}
            locations={[0, 0.25, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]} hitSlop={12}>
              <Feather name="arrow-left" size={18} color="#F5F5F0" />
            </Pressable>
            <BrandWordmark style={{ opacity: 0.9 }} />
            <View style={styles.topRight}>
              <Pressable onPress={toggleSave} style={[styles.circleBtn, { backgroundColor: saved ? colors.gold : "rgba(11,11,12,0.6)" }]} hitSlop={12}>
                <Feather name="heart" size={16} color={saved ? "#0B0B0C" : "#F5F5F0"} />
              </Pressable>
              <Pressable style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]} hitSlop={12}>
                <Feather name="share" size={16} color="#F5F5F0" />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.pillRow}>
              {/* Style pill — when look.style is a known TREND name (e.g.
                  "Old Money", "Y2K Revival"), upgrade it to a tappable
                  affordance that jumps to /style with trendHint pre-loaded
                  (batch 51 mechanism). Closes the "I love this look's
                  vibe → make me more of it" loop in ONE tap. The trending-up
                  icon + chevron makes the affordance visible vs the plain
                  pill for non-trend styles. Mirrors batch 45's CHANNEL CTA
                  but for taste bias rather than brand bias. */}
              {TRENDS.some((t) => t.name === look.style) ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: "/(tabs)/style",
                      params: { trendHint: look.style },
                    });
                  }}
                  style={[styles.stylePill, styles.stylePillTappable, { borderColor: colors.gold }]}
                  hitSlop={6}
                >
                  <Feather name="trending-up" size={9} color={colors.gold} />
                  <Text style={[styles.stylePillText, { color: colors.gold }]}>{look.style}</Text>
                  <Feather name="chevron-right" size={11} color={colors.gold} />
                </Pressable>
              ) : (
                <View style={[styles.stylePill, { borderColor: colors.gold }]}>
                  <Text style={[styles.stylePillText, { color: colors.gold }]}>{look.style}</Text>
                </View>
              )}
              {look.colorPalette ? (
                <View style={[styles.stylePill, { borderColor: "rgba(245,245,240,0.4)" }]}>
                  <Text style={[styles.stylePillText, { color: "rgba(245,245,240,0.85)" }]}>
                    {look.colorPalette}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.lookName}>{look.name}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroCrumb}>{look.occasion} · {look.season}</Text>
              <Text style={[styles.heroPrice, { color: colors.gold }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Description ── */}
        <View style={[styles.descSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {look.description}
          </Text>
          {look.inspiredBy ? (() => {
            // Resolve the inspiredBy name to a real celeb so we can make the
            // chip tappable (pivot back to the icon's full profile — closes
            // the look→celeb edge of the loop). If unresolved (legacy data,
            // typo, etc) we fall back to a non-interactive label so the
            // attribution still shows correctly.
            const linkedCeleb = findCelebByName(look.inspiredBy);
            const Inner = (
              <>
                <Text style={[styles.brandsLabel, { color: colors.mutedForeground }]}>
                  INSPIRED BY
                </Text>
                <View style={styles.inspiredRow}>
                  <Feather name="star" size={11} color={colors.gold} />
                  <Text style={[styles.inspiredName, { color: colors.gold }]}>
                    {look.inspiredBy!.toUpperCase()}
                  </Text>
                  {linkedCeleb && (
                    <Feather name="chevron-right" size={13} color={colors.gold} />
                  )}
                </View>
              </>
            );
            return linkedCeleb ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/celebrity/${linkedCeleb.id}`);
                }}
                style={({ pressed }) => [styles.brandsBlock, { opacity: pressed ? 0.7 : 1 }]}
              >
                {Inner}
              </Pressable>
            ) : (
              <View style={styles.brandsBlock}>{Inner}</View>
            );
          })() : null}
          {(() => {
            const brands = getSignatureBrands(look.style, 4);
            if (brands.length === 0) return null;
            // Quantify the editorial bias: how many of this look's actual
            // pieces were pulled from the style's signature houses. Relies on
            // engine-stamped piece.signature (batch 21) — never display-time
            // string matching. Hidden when 0 (e.g. legacy static looks).
            const sigCount = look.pieces.filter((p) => p.signature).length;
            const totalCount = look.pieces.length;
            return (
              <View style={styles.brandsBlock}>
                <Text style={[styles.brandsLabel, { color: colors.mutedForeground }]}>
                  SIGNATURE HOUSES
                </Text>
                {/* Batch 67: switched from inline `·`-joined Text to a chip
                    grid matching the celebrity signatureBrands chips vocab
                    from batch 64. SIGNATURE HOUSES on the look page and
                    `Brands They Wear` on the celebrity page are the SAME
                    concept (signature houses of a style) — same visual
                    treatment removes the inconsistency. Dropped the celeb-
                    specific accent special-case (look has no celeb
                    context — pure style brands, no brand-of-record). */}
                <View style={styles.brandsGrid}>
                  {brands.map((brand) => {
                    const linkable = brandCatalog.has(brand.toLowerCase());
                    const fg = linkable ? colors.gold : colors.foreground;
                    const chipBase = [
                      styles.brandChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: linkable ? colors.gold + "55" : colors.border,
                      },
                    ];
                    const inner = (
                      <>
                        <Text style={[styles.brandChipText, { color: fg }]}>
                          {brand}
                        </Text>
                        {linkable && (
                          <Feather name="chevron-right" size={11} color={fg} />
                        )}
                      </>
                    );
                    return linkable ? (
                      <Pressable
                        key={brand}
                        onPress={() => goShopBrand(brand)}
                        style={({ pressed }) => [...chipBase, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        {inner}
                      </Pressable>
                    ) : (
                      <View key={brand} style={chipBase}>
                        {inner}
                      </View>
                    );
                  })}
                </View>
                {sigCount > 0 && (
                  <View style={styles.sigCountRow}>
                    <Feather name="star" size={10} color={colors.gold} />
                    <Text style={[styles.sigCountText, { color: colors.gold }]}>
                      {sigCount} OF {totalCount} PIECES FROM SIGNATURE HOUSES
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {/* ── Panel toggle ── */}
        <View style={[styles.panelToggle, { borderBottomColor: colors.border }]}>
          {(["details", "shop"] as PanelView[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPanel(p)}
              style={[styles.panelTab, p === panel && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.panelTabText, { color: p === panel ? colors.gold : colors.mutedForeground }]}>
                {p === "details" ? "LOOK DETAILS" : "SHOP THE LOOK"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Details panel ── */}
        {panel === "details" && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Look</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {look.pieces.length} pieces · Est. ${look.estimatedPrice.toLocaleString()}
            </Text>

            {look.pieces.map((piece, idx) => (
              <View
                key={piece.id}
                style={[styles.pieceRow, { borderBottomColor: colors.border }, idx === look.pieces.length - 1 && { borderBottomWidth: 0 }]}
              >
                {/* Piece image */}
                <View style={[styles.pieceThumb, { backgroundColor: colors.secondary }]}>
                  <ResilientImage
                    uri={piece.imageUrl}
                    localSource={piece.localImage}
                    style={styles.pieceThumbImg}
                    fallbackColor={categoryColor(piece.category)}
                    brand={piece.brand}
                    category={piece.category}
                    color={piece.color}
                  />
                </View>
                <View style={styles.pieceInfo}>
                  {brandCatalog.has(piece.brand.toLowerCase()) ? (
                    <Pressable
                      onPress={() => goShopBrand(piece.brand)}
                      hitSlop={6}
                      style={({ pressed }) => [styles.brandLinkRow, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={[styles.pieceBrand, { color: colors.gold }]}>{piece.brand.toUpperCase()}</Text>
                      <Feather name="chevron-right" size={11} color={colors.gold} />
                    </Pressable>
                  ) : (
                    <Text style={[styles.pieceBrand, { color: colors.gold }]}>{piece.brand.toUpperCase()}</Text>
                  )}
                  <Text style={[styles.pieceName, { color: colors.foreground }]}>{piece.name}</Text>
                  <Text style={[styles.pieceCategory, { color: colors.mutedForeground }]}>{piece.category} · {piece.color}</Text>
                </View>
                <Text style={[styles.piecePrice, { color: colors.foreground }]}>
                  ${piece.price.toLocaleString()}
                </Text>
              </View>
            ))}

            <View style={[styles.totalRow, { borderTopColor: colors.gold }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>TOTAL LOOK</Text>
              <Text style={[styles.totalPrice, { color: colors.foreground }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* ── Shop panel ── */}
        {panel === "shop" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop the Look</Text>
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              Tap any item to purchase directly from the brand
            </Text>

            {look.pieces.map((piece, idx) => {
              const pid = `look_${look.id}_${piece.id}`;
              const pieceSaved = isProductSaved(pid);
              return (
                <Pressable
                  key={piece.id}
                  onPress={() => piece.purchaseUrl && Linking.openURL(piece.purchaseUrl).catch(() => {})}
                  style={({ pressed }) => [
                    styles.shopRow,
                    { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 },
                    idx === look.pieces.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  {/* Product image */}
                  <View style={[styles.shopThumb, { backgroundColor: colors.secondary }]}>
                    <ResilientImage
                      uri={piece.imageUrl}
                    localSource={piece.localImage}
                      style={styles.shopThumbImg}
                      fallbackColor={categoryColor(piece.category)}
                      brand={piece.brand}
                      category={piece.category}
                      color={piece.color}
                    />
                  </View>

                  <View style={styles.shopInfo}>
                    <View style={styles.shopBrandRow}>
                      {brandCatalog.has(piece.brand.toLowerCase()) ? (
                        // Nested Pressable: outer row handles purchase URL,
                        // this inner handles brand→shop handoff. RN's
                        // Pressable doesn't bubble when the inner handles
                        // the tap (same pattern as the heart-save Pressable
                        // a few lines below). hitSlop kept tight so the
                        // outer purchase intent still wins for most of the
                        // row's surface area.
                        <Pressable
                          onPress={() => goShopBrand(piece.brand)}
                          hitSlop={4}
                          style={({ pressed }) => [styles.brandLinkRow, { opacity: pressed ? 0.6 : 1 }]}
                        >
                          <Text style={[styles.shopBrand, { color: colors.gold }]}>
                            {piece.brand.toUpperCase()}
                          </Text>
                          <Feather name="chevron-right" size={11} color={colors.gold} />
                        </Pressable>
                      ) : (
                        <Text style={[styles.shopBrand, { color: colors.gold }]}>
                          {piece.brand.toUpperCase()}
                        </Text>
                      )}
                      {piece.signature ? (
                        <View style={styles.sigBadge}>
                          <Feather name="star" size={8} color={colors.gold} />
                          <Text style={[styles.sigBadgeText, { color: colors.gold }]}>
                            SIGNATURE
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.shopName, { color: colors.foreground }]} numberOfLines={2}>
                      {piece.name}
                    </Text>
                    <View style={styles.shopPriceRow}>
                      <Text style={[styles.shopPrice, { color: colors.foreground }]}>
                        ${piece.price.toLocaleString()}
                      </Text>
                      <View style={[styles.buyBadge, { backgroundColor: "rgba(198,167,94,0.12)", borderColor: colors.gold }]}>
                        <Feather name="external-link" size={9} color={colors.gold} />
                        <Text style={[styles.buyBadgeText, { color: colors.gold }]}>BUY</Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      saveProduct({ id: pid, name: piece.name, brand: piece.brand, price: piece.price, category: piece.category, style: look.style, description: "", imageUrl: piece.imageUrl ?? "", localImage: piece.localImage, purchaseUrl: piece.purchaseUrl ?? "", inspiredBy: look.inspiredBy, lookId: look.id });
                    }}
                    hitSlop={12}
                    style={styles.heartBtn}
                  >
                    <Feather name="heart" size={16} color={pieceSaved ? colors.gold : colors.mutedForeground} />
                  </Pressable>
                </Pressable>
              );
            })}

            <View style={[styles.shopTotal, { borderTopColor: colors.border }]}>
              <View>
                <Text style={[styles.shopTotalLabel, { color: colors.mutedForeground }]}>TOTAL LOOK</Text>
                <Text style={[styles.shopTotalPrice, { color: colors.foreground }]}>
                  ${look.estimatedPrice.toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={shopAll}
                style={[styles.shopAllBtn, { backgroundColor: colors.gold }]}
              >
                <Feather name="external-link" size={13} color="#0B0B0C" />
                <Text style={styles.shopAllText}>ADD ALL TO BAG</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── CTAs ── */}
        <View style={styles.cta}>
          <GoldButton label="SHOP THE LOOK" onPress={() => setPanel("shop")} />
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/tryon", params: { lookId: look.id } }); }}
            style={[styles.tryOnBtn, { borderColor: colors.gold, backgroundColor: "rgba(198,167,94,0.08)" }]}
          >
            <Feather name="camera" size={14} color={colors.gold} />
            <Text style={[styles.tryOnText, { color: colors.gold }]}>VIRTUAL TRY-ON</Text>
          </Pressable>
          <GoldButton label={saved ? "SAVED ✓" : "SAVE LOOK"} onPress={toggleSave} variant="outline" />
        </View>

        {/* ── Piece thumb strip ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
          {look.pieces.map((piece) => (
            <Pressable
              key={piece.id}
              onPress={() => piece.purchaseUrl && Linking.openURL(piece.purchaseUrl).catch(() => {})}
              style={[styles.stripThumb, { backgroundColor: colors.secondary }]}
            >
              <ResilientImage
                uri={piece.imageUrl}
                    localSource={piece.localImage}
                style={styles.stripImg}
                fallbackColor={categoryColor(piece.category)}
                transition={200}
                brand={piece.brand}
                category={piece.category}
                color={piece.color}
              />
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Related ── */}
        <View style={[styles.relatedSection, { borderTopColor: colors.border }]}>
          {(() => {
            // When the related rail is icon-driven (batch 41), surface a
            // one-tap CHANNEL CTA next to the title. Previously the only way
            // from this rail back into a {Celeb}-biased generation was:
            //   inspired pill → /celebrity/[id] → GENERATE MY <CELEB> LOOK → /style
            // — three taps even though we already know the icon. This pushes
            // straight to /(tabs)/style with the celebrity param (same shape
            // used by /celebrity/[id]'s GENERATE buttons), so style.tsx's
            // useEffect snapshots activeCeleb and shows the CHANNELING chip
            // (batch 44). Resolved-only — silently absent if findCelebByName
            // can't link the name (legacy data / typo).
            const relCeleb = relatedDrivenByCeleb && look.inspiredBy
              ? findCelebByName(look.inspiredBy)
              : undefined;
            // Parallel to relCeleb: when the rail is NOT celeb-driven AND
            // look.style is a known TREND, upgrade the header to "More
            // {Trend}" with a one-tap MORE CTA that pushes /style with
            // trendHint pre-loaded. Mutual exclusion (celeb → trend →
            // neutral) mirrors the chip-slot priority on the style screen
            // (batch 51). Visually parallel to CHANNEL: reuses
            // channelCta/channelCtaText styles, swaps icon (trending-up vs
            // refresh-cw) and color (gold vs accentColor) to match the
            // trend-bias visual vocab from batches 51-54. Seventh surface
            // for the trend-hint loop.
            const relTrendName =
              !relatedDrivenByCeleb && TRENDS.some((t) => t.name === look.style)
                ? look.style
                : null;
            return (
              <View style={styles.relatedHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {relatedDrivenByCeleb && look.inspiredBy
                    ? `More from ${look.inspiredBy}`
                    : relTrendName
                    ? `More ${relTrendName}`
                    : "You Might Also Love"}
                </Text>
                {relCeleb ? (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push({
                        pathname: "/(tabs)/style",
                        params: { celebrity: relCeleb.id, celebName: relCeleb.name },
                      });
                    }}
                    style={({ pressed }) => [
                      styles.channelCta,
                      { borderColor: relCeleb.accentColor, opacity: pressed ? 0.75 : 1 },
                    ]}
                    hitSlop={6}
                  >
                    <Feather name="refresh-cw" size={10} color={relCeleb.accentColor} />
                    <Text style={[styles.channelCtaText, { color: relCeleb.accentColor }]}>
                      CHANNEL
                    </Text>
                  </Pressable>
                ) : relTrendName ? (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push({
                        pathname: "/(tabs)/style",
                        params: { trendHint: relTrendName },
                      });
                    }}
                    style={({ pressed }) => [
                      styles.channelCta,
                      { borderColor: colors.gold, opacity: pressed ? 0.75 : 1 },
                    ]}
                    hitSlop={6}
                  >
                    <Feather name="trending-up" size={10} color={colors.gold} />
                    <Text style={[styles.channelCtaText, { color: colors.gold }]}>
                      MORE
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })()}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {assignUniqueLookImages(
              allRelated.map((l) => ({ ...l, image: hasNamedLookImageForStyle(l.name, l.style) ? l.image : (pickStyleHero(l.style, userProfile.gender, `rel-${l.id}`) ?? pickLookHero(l.name, userProfile.gender, `rel-${l.id}`) ?? l.image) })),
              userProfile.gender,
            ).map((l) => <LookCard key={l.id} look={l} />)}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    Dress: "#C6A75E", Top: "#6B7280", Bottom: "#4B5563",
    Outerwear: "#9A7C38", Shoes: "#9CA3AF", Bag: "#C6A75E",
    Jewelry: "#E0C882", Accessories: "#C6A75E",
  };
  return map[cat] ?? "#6B7280";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  heroContainer: { height: height * 0.58, position: "relative", justifyContent: "flex-end" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, alignItems: "center" },
  circleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  topRight: { flexDirection: "row", gap: 10 },
  heroInfo: { padding: 24, gap: 8 },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  stylePill: { alignSelf: "flex-start", borderWidth: 0.5, paddingHorizontal: 10, paddingVertical: 4 },
  stylePillTappable: { flexDirection: "row", alignItems: "center", gap: 6 },
  stylePillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  lookName: { fontSize: 28, fontFamily: "PlayfairDisplay_700Bold", color: "#F5F5F0", lineHeight: 34 },
  heroMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroCrumb: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(245,245,240,0.7)", letterSpacing: 0.5 },
  heroPrice: { fontSize: 22, fontFamily: "PlayfairDisplay_700Bold" },
  descSection: { padding: 24, borderBottomWidth: 0.5 },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, letterSpacing: 0.2 },
  brandsBlock: { marginTop: 18, gap: 6 },
  relatedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  channelCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  channelCtaText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  brandsLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  // brandsList retained for backward-compat reference but no longer rendered
  // (batch 67 replaced the inline `·`-joined text with the chip grid below).
  brandsList: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5, lineHeight: 18 },
  // Chip grid for SIGNATURE HOUSES — mirrors celebrity `Brands They Wear`
  // styles (batch 64) so the same concept reads the same across both pages.
  brandsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  brandChip: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  inspiredRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  inspiredName: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  sigCountRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  sigCountText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  panelToggle: { flexDirection: "row", borderBottomWidth: 0.5 },
  panelTab: { flex: 1, paddingVertical: 16, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  panelTabText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  section: { padding: 24, paddingBottom: 8, borderBottomWidth: 0.5 },
  sectionTitle: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", marginBottom: 4 },
  sectionMeta: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.3, marginBottom: 20 },
  pieceRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 0.5 },
  pieceThumb: { width: 60, height: 60, borderRadius: 4, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pieceThumbImg: { width: "100%", height: "100%" },
  pieceDot: { width: 18, height: 18, borderRadius: 9 },
  pieceInfo: { flex: 1, gap: 3 },
  pieceBrand: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  brandLinkRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  pieceName: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  pieceCategory: { fontSize: 11, fontFamily: "Inter_400Regular" },
  piecePrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 20, borderTopWidth: 0.5, marginTop: 4 },
  totalLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  totalPrice: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold" },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: 0.5 },
  shopThumb: { width: 68, height: 68, borderRadius: 4, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  shopThumbImg: { width: "100%", height: "100%" },
  shopInfo: { flex: 1, gap: 4 },
  shopBrandRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  shopBrand: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  sigBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 0.5, borderColor: "rgba(198,167,94,0.5)", paddingHorizontal: 5, paddingVertical: 1 },
  sigBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  shopName: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  shopPriceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  shopPrice: { fontSize: 16, fontFamily: "PlayfairDisplay_700Bold" },
  buyBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 7, paddingVertical: 3 },
  buyBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  heartBtn: { padding: 4, flexShrink: 0 },
  shopTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 18, paddingBottom: 20, borderTopWidth: 0.5, marginTop: 4 },
  shopTotalLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 2 },
  shopTotalPrice: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold" },
  shopAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 2 },
  shopAllText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#0B0B0C" },
  cta: { padding: 24, gap: 12 },
  tryOnBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 2, borderWidth: 1 },
  tryOnText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  thumbStrip: { paddingHorizontal: 24, gap: 10, paddingBottom: 20 },
  stripThumb: { width: 60, height: 60, borderRadius: 4, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  stripImg: { width: "100%", height: "100%" },
  stripDot: { width: 20, height: 20, borderRadius: 10 },
  relatedSection: { borderTopWidth: 0.5, paddingTop: 24, paddingBottom: 8 },
});
