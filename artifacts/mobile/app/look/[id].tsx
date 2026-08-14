import * as Haptics from "expo-haptics";
import { safeBack } from "../../lib/nav";
import { Image } from "expo-image";
import { LinearGradient } from "@/lib/safeWebShims";
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
import { ResilientImage, resolveEffectiveImageUri } from "@/components/ResilientImage";
import { ZoomableImage } from "@/components/ZoomableImage";
import { LOOKS, TRENDS, filterLooksForProfile } from "@/constants/data";
import { useShopBrandHandoff } from "@/hooks/useShopBrandHandoff";
import { findCelebByName } from "@/lib/celebLookup";
import { pickLookHero, pickStyleHero } from "@/constants/heroImages";
import { hasNamedLookImageForStyle, assignUniqueLookImages, getSignatureBrands } from "@/lib/outfitEngine";
import { openAffiliateProduct } from "@/lib/affiliateLinkService";
import { CHANGE_ITEM_MODES, REMIX_ACTIONS, changeItem, remixLook, type ChangeItemMode, type RemixAction } from "@/lib/remix";
import { NOT_FOR_ME_REASONS } from "@/lib/feedback";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { GoldDot } from "@/components/GoldDot";
import type { Look } from "@/constants/data";

const { width, height } = Dimensions.get("window");

type PanelView = "details" | "shop";

export default function LookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLookSaved, saveLook, unsaveLook, saveProduct, isProductSaved, findLook, userProfile, savedLooks, registerGeneratedLooks, loveLook, rejectLook, lookFeedbackGiven } = useApp();
  const [panel, setPanel] = useState<PanelView>("details");
  // Runtime-resolved image URI per piece (keyed by piece.id / "sneakerAlt").
  // ResilientImage reports what it is ACTUALLY showing (real photo can fail
  // → AI product shot at runtime); the zoom lightbox must enlarge the same
  // image, not the original failed URL.
  const [runtimeImageUris, setRuntimeImageUris] = useState<Record<string, string | undefined>>({});
  const reportRuntimeUri = (key: string) => (uri: string | undefined) =>
    setRuntimeImageUris((prev) => (prev[key] === uri ? prev : { ...prev, [key]: uri }));
  // Remix This Look — which action is generating, and the last soft failure.
  const [remixing, setRemixing] = useState<RemixAction | null>(null);
  const [remixError, setRemixError] = useState<string | null>(null);
  // Keep This Item — locked pieces survive every remix (never replaced).
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  // Change This Item — which piece's swap options are open, and busy state.
  const [changeTarget, setChangeTarget] = useState<string | null>(null);
  const [changing, setChanging] = useState<ChangeItemMode | null>(null);
  // Not For Me — whether the reason picker is open.
  const [showReasons, setShowReasons] = useState(false);

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
    // Profile-filter the static LOOKS pool before any tier picks so related
    // suggestions can never cross gender (a women's look detail must not
    // recommend men's looks and vice versa). savedLooks is intentionally
    // left unfiltered: it's the user's own history, and hiding a saved
    // look because their current profile gender drifted from when they
    // saved it would be more confusing than helpful.
    const catalogPool = filterLooksForProfile(LOOKS, userProfile);
    if (!look) return { allRelated: catalogPool.slice(0, 3), relatedDrivenByCeleb: false };
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
      take(catalogPool, (l) => l.inspiredBy === look.inspiredBy);
      if (picked.length > before) celebDriven = true;
    }
    take(catalogPool, (l) => l.style === look.style);
    take(catalogPool, (l) => l.occasion === look.occasion);
    take(catalogPool, () => true);
    return { allRelated: picked, relatedDrivenByCeleb: celebDriven };
  })();

  if (!look) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_600SemiBold" }]}>Look not found</Text>
        <Pressable onPress={() => safeBack()}>
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

  // Record a BUY tap (fire-and-forget) then open the retailer. One helper so
  // all four purchase affordances on this screen log identically.
  // Remix This Look: derive new params from THIS look, run the engine (all
  // hard gates + global dedup apply), register the result and navigate to it.
  const runRemix = (action: RemixAction) => {
    if (!look || remixing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRemixError(null);
    setRemixing(action);
    // Defer a tick so the "STYLING…" state paints before the synchronous
    // engine call blocks the JS thread.
    setTimeout(() => {
      try {
        const remixed = remixLook(look, action, {
          favoriteStyles: userProfile.favoriteStyles,
          season: userProfile.season,
          // Locked pieces ride through the remix untouched.
          lockedItems: look.pieces.filter((p) => lockedIds.has(p.id)),
        });
        if (!remixed) {
          setRemixError("Couldn't compose a fresh remix in that direction — try another one.");
          return;
        }
        registerGeneratedLooks([remixed]);
        router.push(`/look/${remixed.id}`);
      } finally {
        setRemixing(null);
      }
    }, 50);
  };

  // Change This Item: swap ONE piece under a constraint; all other pieces are
  // locked so the outfit is preserved, and the whole look is re-validated.
  const runChange = (pieceId: string, mode: ChangeItemMode) => {
    if (!look || changing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRemixError(null);
    setChanging(mode);
    setTimeout(() => {
      try {
        const updated = changeItem(look, pieceId, mode, { favoriteStyles: userProfile.favoriteStyles });
        if (!updated) {
          setRemixError("No piece in the catalog satisfies that swap right now — try a different direction.");
          return;
        }
        registerGeneratedLooks([updated]);
        setChangeTarget(null);
        router.push(`/look/${updated.id}`);
      } finally {
        setChanging(null);
      }
    }, 50);
  };

  const buyPiece = (
    piece: { name: string; brand: string; category: string; price: number; purchaseUrl?: string },
    eventType: "affiliate_click" | "buy_outfit_click" = "affiliate_click",
  ) => {
    // ONE shared shopping handler for the whole app (central resolver).
    openAffiliateProduct({ ...piece, lookName: look.name }, eventType);
  };

  const shopAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Only open the FIRST piece — modern browsers block multi-window opens
    // from a single click as popup-bombing. setTimeout chains were 100%
    // blocked on web (out-of-gesture). Native users can tap the per-piece
    // BUY rows below to open each item individually.
    const first = look.pieces.find((p) => p.purchaseUrl);
    if (first) buyPiece(first, "buy_outfit_click");
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
            <Pressable onPress={() => safeBack()} style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]} hitSlop={12}>
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
            {/* Gold rule (batch 126) — extends the editorial motif onto the
                look-detail hero overlay, the visual centerpiece of the most
                visited deep route. heroInfo has gap:8 between children;
                marginTop:-3 tightens the rule into a ~5px pairing under the
                28px Playfair lookName, leaving the natural 8px to heroMeta.
                width:28 matches the title font-size (1:1). The strong dark
                LinearGradient at the bottom of the hero (0.6→#0B0B0C) gives
                the gold rule plenty of contrast over varied image backdrops. */}
            <TitleRule width={28} style={{ marginTop: -3 }} />
            <View style={styles.heroMeta}>
              {/* Gold middle-dot separator (batch 129; refactored to shared
                  <GoldDot /> in batch 131). Triadic gold composition with
                  the gold TitleRule above and gold heroPrice to the right. */}
              <Text style={styles.heroCrumb}>
                {look.occasion}<GoldDot />{look.season}
              </Text>
              <Text style={[styles.heroPrice, { color: colors.gold }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Description ── */}
        <View style={[styles.descSection, { borderBottomColor: colors.border }]}>
          {look.occasion === "AI Stylist" ? (
            <View style={styles.aiAttribution}>
              <Feather name="zap" size={10} color={colors.gold} />
              <Text style={[styles.aiAttributionText, { color: colors.gold }]}>
                STYLED BY MAISON SIMON AI
              </Text>
            </View>
          ) : null}
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {look.description}
          </Text>
          {/* Why This Look Works — concrete styling logic composed by the
              engine from the look's real pieces/palette (styling-agent spec). */}
          {look.whyItWorks ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.brandsLabel, { color: colors.gold }]}>
                WHY THIS LOOK WORKS
              </Text>
              <Text style={[styles.description, { color: colors.mutedForeground, marginTop: 8 }]}>
                {look.whyItWorks}
              </Text>
            </View>
          ) : null}
          {look.stylistTip ? (
            <View style={{ marginTop: 14, borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 12 }}>
              <Text style={[styles.brandsLabel, { color: colors.mutedForeground }]}>
                STYLIST TIP
              </Text>
              <Text style={[styles.description, { color: colors.mutedForeground, marginTop: 6, fontStyle: "italic" }]}>
                {look.stylistTip}
              </Text>
            </View>
          ) : null}
          {/* AI palette swatches — only render hex-valid entries so a
              malformed model response can't crash RN's color parser. The
              palette NAME already shows in the hero pill (e.g. "Champagne
              & Ivory"); this makes that name visually concrete. */}
          {(() => {
            const HEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
            const swatches = (look.paletteColors ?? []).filter((c) => HEX.test(c));
            if (swatches.length === 0) return null;
            return (
              <View style={styles.paletteBlock}>
                <Text style={[styles.brandsLabel, { color: colors.mutedForeground }]}>
                  COLOR STORY
                </Text>
                <View style={styles.swatchRow}>
                  {swatches.map((hex, idx) => (
                    <View
                      key={`${hex}-${idx}`}
                      style={[
                        styles.swatch,
                        { backgroundColor: hex, borderColor: colors.border },
                      ]}
                    />
                  ))}
                  {look.colorPalette ? (
                    <Text style={[styles.swatchCaption, { color: colors.mutedForeground }]}>
                      {look.colorPalette}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })()}
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
            {/* Gold rule (batch 123) — extends the motif (batches 115-122)
                into the look-detail section headers. width:24 matches the
                20px Playfair sectionTitle proportion. */}
            <TitleRule width={24} style={styles.sectionRule} />
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              {look.pieces.length} pieces<GoldDot />Est. ${look.estimatedPrice.toLocaleString()}
            </Text>

            {look.pieces.map((piece, idx) => (
              <View
                key={piece.id}
                style={[styles.pieceRow, { borderBottomColor: colors.border }, idx === look.pieces.length - 1 && { borderBottomWidth: 0 }]}
              >
                {/* Piece image — tap to enlarge, tap again to shrink. */}
                <ZoomableImage
                  source={
                    piece.localImage
                      ? piece.localImage
                      : (() => {
                          const eff =
                            piece.id in runtimeImageUris
                              ? runtimeImageUris[piece.id]
                              : resolveEffectiveImageUri(piece.imageUrl, piece.brand, piece.name, piece.category, piece.color);
                          return eff ? { uri: eff } : null;
                        })()
                  }
                  accessibilityLabel={`${piece.brand} ${piece.name}`}
                >
                  <View style={[styles.pieceThumb, { backgroundColor: colors.secondary }]}>
                    <ResilientImage
                      uri={piece.imageUrl}
                      localSource={piece.localImage}
                      style={styles.pieceThumbImg}
                      fallbackColor={categoryColor(piece.category)}
                      brand={piece.brand}
                      name={piece.name}
                      category={piece.category}
                      color={piece.color}
                      onEffectiveUriChange={reportRuntimeUri(piece.id)}
                    />
                  </View>
                </ZoomableImage>
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
                  <Text style={[styles.pieceCategory, { color: colors.mutedForeground }]}>
                    {look.sneakerAlt && piece.category === "shoes" ? (
                      <>FORMAL<GoldDot />{piece.color}</>
                    ) : (
                      <>{piece.category}<GoldDot />{piece.color}</>
                    )}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Text style={[styles.piecePrice, { color: colors.foreground }]}>
                    ${piece.price.toLocaleString()}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {/* Keep This Item — locked pieces survive every remix. */}
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setLockedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(piece.id)) next.delete(piece.id); else next.add(piece.id);
                          return next;
                        });
                      }}
                      accessibilityLabel={lockedIds.has(piece.id) ? "Unlock item" : "Keep this item"}
                    >
                      <Feather
                        name={lockedIds.has(piece.id) ? "lock" : "unlock"}
                        size={14}
                        color={lockedIds.has(piece.id) ? colors.gold : colors.mutedForeground}
                      />
                    </Pressable>
                    {/* Change This Item */}
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setChangeTarget((cur) => (cur === piece.id ? null : piece.id));
                      }}
                      accessibilityLabel="Change this item"
                    >
                      <Feather
                        name="refresh-cw"
                        size={14}
                        color={changeTarget === piece.id ? colors.gold : colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {/* Change This Item — swap options for the selected piece. */}
            {changeTarget && look.pieces.some((p) => p.id === changeTarget) ? (
              <View style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                <Text style={[styles.altHeader, { color: colors.gold }]}>CHANGE THIS ITEM</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {CHANGE_ITEM_MODES.map((mode) => (
                    <Pressable
                      key={mode}
                      disabled={changing !== null}
                      onPress={() => runChange(changeTarget, mode)}
                      style={({ pressed }) => [{
                        borderWidth: 1,
                        borderColor: changing === mode ? colors.gold : colors.border,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        opacity: pressed || (changing !== null && changing !== mode) ? 0.5 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 10, letterSpacing: 1, color: changing === mode ? colors.gold : colors.mutedForeground }}>
                        {changing === mode ? "SWAPPING…" : mode.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={[styles.totalRow, { borderTopColor: colors.gold }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>TOTAL LOOK</Text>
              <Text style={[styles.totalPrice, { color: colors.foreground }]}>
                ${look.estimatedPrice.toLocaleString()}
              </Text>
            </View>

            {/* Affiliate disclosure — required, easy to see near every BUY affordance. */}
            <AffiliateDisclosure style={styles.disclosure} />

            {/* Fashion Remix sneaker alternative — colour + budget-matched pair
                the user can swap in for the look's shoe. Tap to shop it. */}
            {look.sneakerAlt ? (
              <View style={[styles.altSection, { borderColor: colors.border }]}>
                <View style={styles.altHeaderRow}>
                  <Feather name="refresh-cw" size={12} color={colors.gold} />
                  <Text style={[styles.altHeader, { color: colors.gold }]}>SWITCH TO SNEAKERS</Text>
                </View>
                <Text style={[styles.altHint, { color: colors.mutedForeground }]}>
                  Swap the formal shoe for this pair — same outfit, relaxed a notch, still polished.
                </Text>
                <Pressable
                  onPress={() => look.sneakerAlt?.purchaseUrl && buyPiece(look.sneakerAlt)}
                  style={({ pressed }) => [styles.pieceRow, { borderBottomWidth: 0, opacity: pressed ? 0.75 : 1 }]}
                >
                  <ZoomableImage
                    source={
                      look.sneakerAlt.localImage
                        ? look.sneakerAlt.localImage
                        : (() => {
                            const eff =
                              "sneakerAlt" in runtimeImageUris
                                ? runtimeImageUris["sneakerAlt"]
                                : resolveEffectiveImageUri(look.sneakerAlt.imageUrl, look.sneakerAlt.brand, look.sneakerAlt.name, "shoes", look.sneakerAlt.color);
                            return eff ? { uri: eff } : null;
                          })()
                    }
                    accessibilityLabel={`${look.sneakerAlt.brand} ${look.sneakerAlt.name}`}
                  >
                    <View style={[styles.pieceThumb, { backgroundColor: colors.secondary }]}>
                      <ResilientImage
                        uri={look.sneakerAlt.imageUrl}
                        localSource={look.sneakerAlt.localImage}
                        style={styles.pieceThumbImg}
                        fallbackColor={categoryColor("shoes")}
                        brand={look.sneakerAlt.brand}
                        name={look.sneakerAlt.name}
                        category="shoes"
                        color={look.sneakerAlt.color}
                        onEffectiveUriChange={reportRuntimeUri("sneakerAlt")}
                      />
                    </View>
                  </ZoomableImage>
                  <View style={styles.pieceInfo}>
                    <Text style={[styles.pieceBrand, { color: colors.gold }]}>{look.sneakerAlt.brand.toUpperCase()}</Text>
                    <Text style={[styles.pieceName, { color: colors.foreground }]}>{look.sneakerAlt.name}</Text>
                    <Text style={[styles.pieceCategory, { color: colors.mutedForeground }]}>
                      sneakers<GoldDot />{look.sneakerAlt.color}
                    </Text>
                  </View>
                  <Text style={[styles.piecePrice, { color: colors.foreground }]}>
                    ${look.sneakerAlt.price.toLocaleString()}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* ── Remix This Look ── */}
            <View style={{ marginTop: 28 }}>
              <Text style={[styles.altHeader, { color: colors.gold }]}>REMIX THIS LOOK</Text>
              <Text style={[styles.sectionMeta, { color: colors.mutedForeground, marginTop: 6 }]}>
                Same standards, new direction — every remix is a fresh, never-shown combination.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {REMIX_ACTIONS.map((action) => (
                  <Pressable
                    key={action}
                    disabled={remixing !== null}
                    onPress={() => runRemix(action)}
                    style={({ pressed }) => [
                      {
                        borderWidth: 1,
                        borderColor: remixing === action ? colors.gold : colors.border,
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        opacity: pressed || (remixing !== null && remixing !== action) ? 0.5 : 1,
                        backgroundColor: remixing === action ? "rgba(198,167,94,0.1)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, letterSpacing: 1, color: remixing === action ? colors.gold : colors.mutedForeground }}>
                      {remixing === action ? "STYLING…" : action.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {remixError ? (
                <Text style={[styles.sectionMeta, { color: colors.mutedForeground, marginTop: 10 }]}>
                  {remixError}
                </Text>
              ) : null}
            </View>

            {/* ── Love This / Not For Me — preference learning ── */}
            <View style={{ marginTop: 28 }}>
              {(() => {
                const rated = lookFeedbackGiven(look.id);
                if (rated) {
                  return (
                    <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
                      {rated === "love"
                        ? "Noted — Simon will lean into this direction."
                        : "Understood — you'll see less of this."}
                    </Text>
                  );
                }
                return (
                  <>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          loveLook(look);
                          setShowReasons(false);
                        }}
                        style={({ pressed }) => [{
                          flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
                          borderWidth: 1, borderColor: colors.gold, borderRadius: 24, paddingVertical: 12,
                          opacity: pressed ? 0.6 : 1,
                        }]}
                      >
                        <Feather name="heart" size={13} color={colors.gold} />
                        <Text style={{ fontSize: 11, letterSpacing: 1.5, color: colors.gold }}>LOVE THIS</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { Haptics.selectionAsync(); setShowReasons((v) => !v); }}
                        style={({ pressed }) => [{
                          flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
                          borderWidth: 1, borderColor: showReasons ? colors.gold : colors.border, borderRadius: 24, paddingVertical: 12,
                          opacity: pressed ? 0.6 : 1,
                        }]}
                      >
                        <Feather name="thumbs-down" size={13} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 11, letterSpacing: 1.5, color: colors.mutedForeground }}>NOT FOR ME</Text>
                      </Pressable>
                    </View>
                    {showReasons ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                        {NOT_FOR_ME_REASONS.map((reason) => (
                          <Pressable
                            key={reason}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              rejectLook(look, reason);
                              setShowReasons(false);
                            }}
                            style={({ pressed }) => [{
                              borderWidth: 1, borderColor: colors.border, borderRadius: 20,
                              paddingHorizontal: 12, paddingVertical: 7, opacity: pressed ? 0.5 : 1,
                            }]}
                          >
                            <Text style={{ fontSize: 10, letterSpacing: 1, color: colors.mutedForeground }}>
                              {reason.toUpperCase()}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </>
                );
              })()}
            </View>
          </View>
        )}

        {/* ── Shop panel ── */}
        {panel === "shop" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop the Look</Text>
            {/* Gold rule (batch 123). */}
            <TitleRule width={24} style={styles.sectionRule} />
            <Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>
              Tap any item to purchase directly from the brand
            </Text>

            {look.pieces.map((piece, idx) => {
              const pid = `look_${look.id}_${piece.id}`;
              const pieceSaved = isProductSaved(pid);
              return (
                <Pressable
                  key={piece.id}
                  onPress={() => buyPiece(piece)}
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
                      name={piece.name}
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
              onPress={() => buyPiece(piece)}
              style={[styles.stripThumb, { backgroundColor: colors.secondary }]}
            >
              <ResilientImage
                uri={piece.imageUrl}
                    localSource={piece.localImage}
                style={styles.stripImg}
                fallbackColor={categoryColor(piece.category)}
                transition={200}
                brand={piece.brand}
                name={piece.name}
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
                {/* titleBlock wraps Text + rule so the right-side CTA
                    (channel pill) anchors to the column as one unit (batch
                    123). */}
                <View style={styles.relatedTitleBlock}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {relatedDrivenByCeleb && look.inspiredBy
                      ? `More from ${look.inspiredBy}`
                      : relTrendName
                      ? `More ${relTrendName}`
                      : "You Might Also Love"}
                  </Text>
                  <TitleRule width={24} style={styles.sectionRule} />
                </View>
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
  aiAttribution: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  aiAttributionText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  paletteBlock: { marginTop: 18, gap: 8 },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 0.5 },
  swatchCaption: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
    marginLeft: 4,
  },
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
  sectionRule: { marginBottom: 8 },
  relatedTitleBlock: { flexShrink: 1 },
  sectionMeta: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.3, marginBottom: 20 },
  pieceRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 0.5 },
  altSection: { marginTop: 20, borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  altHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  altHeader: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  altHint: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.2, marginTop: 4 },
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
  disclosure: { marginTop: 10 },
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
