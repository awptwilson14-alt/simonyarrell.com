import * as Haptics from "expo-haptics";
import { safeBack } from "../lib/nav";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { LOOKS, TRENDS, filterLooksForProfile } from "@/constants/data";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useShopBrandHandoff } from "@/hooks/useShopBrandHandoff";

const { width, height } = Dimensions.get("window");

// How much of the top of the screen is reserved for the user's face (camera shows through)
const FACE_ZONE = height * 0.26;
// How far down from the outfit photo top to crop (removes model's head from photo)
const PHOTO_FACE_CROP = height * 0.18;
// Position step per tap
const POSITION_STEP = 28;
const POSITION_MIN = -120;
const POSITION_MAX = 120;

type OpacityLevel = "sheer" | "blend" | "vivid";
const OPACITY_VALUES: Record<OpacityLevel, number> = { sheer: 0.35, blend: 0.65, vivid: 0.92 };

export default function TryOnScreen() {
  const colors = useColors();
  const { userProfile } = useApp();
  const heroKey: "men" | "women" = userProfile.gender === "Men" ? "men" : "women";
  const editorialBackdrop = SPLASH_HEROES[heroKey];
  // Brand + trend handoffs for the bottom panel (batch 73). The piece.brand
  // micro-label under each piece thumb routes to /shop with the brand
  // filter pre-applied — same primitive used everywhere else (closet,
  // look-detail, celebrity, ProductCard, home strip batch 72). The
  // activeLook.style label in the look navigator routes to /style with
  // trendHint pre-loaded when the style matches a known TREND — same
  // primitive used by LookCard styleTag (batch 68), look-detail style
  // pill (52), profile favStyleChips (51), celebrity styleTag (70). Both
  // are fail-closed: non-catalog brand or non-TREND style stays a flat
  // muted Text so the camera UI never reveals a broken nav.
  const { brandCatalog, goShopBrand } = useShopBrandHandoff();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [opacityLevel, setOpacityLevel] = useState<OpacityLevel>("vivid");
  const [verticalOffset, setVerticalOffset] = useState(0); // px: negative = up, positive = down

  // Carousel pool is profile-filtered — a Men profile can't swipe into a
  // women's look here. If the deep-linked `lookId` survives the gender filter
  // we honour it; otherwise we silently land on index 0 of the filtered pool.
  // Falls back to full LOOKS only if the filter produced nothing (defensive —
  // shouldn't happen because every static look is gender-tagged).
  const availableLooks = (() => {
    const filtered = filterLooksForProfile(LOOKS, userProfile);
    return filtered.length > 0 ? filtered : LOOKS;
  })();
  const [activeLookIdx, setActiveLookIdx] = useState(() => {
    if (lookId) {
      const idx = availableLooks.findIndex((l) => l.id === lookId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const isNative = Platform.OS !== "web";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(60)).current;
  const lookFade = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(OPACITY_VALUES.vivid)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: isNative }),
      Animated.timing(panelSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: isNative }),
    ]).start();
  }, []);

  const switchLook = (dir: "prev" | "next") => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(lookFade, { toValue: 0, duration: 110, useNativeDriver: isNative }),
      Animated.timing(lookFade, { toValue: 1, duration: 200, useNativeDriver: isNative }),
    ]).start();
    setActiveLookIdx((i) => (dir === "next" ? (i + 1) % availableLooks.length : (i - 1 + availableLooks.length) % availableLooks.length));
  };

  const changeOpacity = (level: OpacityLevel) => {
    Haptics.selectionAsync();
    setOpacityLevel(level);
    Animated.timing(overlayOpacity, { toValue: OPACITY_VALUES[level], duration: 220, useNativeDriver: isNative }).start();
  };

  const nudge = (dir: "up" | "down") => {
    Haptics.selectionAsync();
    setVerticalOffset((v) => {
      const next = dir === "up" ? v - POSITION_STEP : v + POSITION_STEP;
      return Math.max(POSITION_MIN, Math.min(POSITION_MAX, next));
    });
  };

  const flipCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === "front" ? "back" : "front"));
  };

  const shareStyleCard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const look = availableLooks[activeLookIdx];
    try {
      await Share.share({
        message: `✨ Styled myself in the "${look.name}" look on Simon Yarrell!\n\nPieces: ${look.pieces.map((p) => `${p.name} by ${p.brand}`).join(", ")}\n\nTotal: $${look.estimatedPrice?.toLocaleString() ?? "—"}\n\n#SimonYarrell #VirtualTryOn #LuxuryFashion`,
        title: `Simon Yarrell — ${look.name}`,
      });
    } catch { /* dismissed */ }
  };

  const activeLook = availableLooks[activeLookIdx];
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  // ── PERMISSION SCREEN ─────────────────────────────────────────────────
  if (permission && !permission.granted) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["rgba(198,167,94,0.08)", "transparent"]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
          <BrandWordmark />
          <Pressable onPress={() => safeBack()} hitSlop={12} style={[s.iconBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={s.permBodyWrap}>
          {/* Gendered editorial backdrop — turns the camera-permission gate
              from a stark text screen into a moment that previews the kind
              of look the user will see modeled on themselves once they
              grant access. Opacity 0.32 + heavy 3-stop dark gradient keeps
              the gold camera circle + Playfair headline as the focal point. */}
          <Image
            source={editorialBackdrop}
            style={s.permBackdrop}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.62)", "rgba(11,11,12,0.86)", "rgba(11,11,12,0.96)"]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.permBody}>
            <View style={[s.permCircle, { backgroundColor: colors.card, borderColor: colors.gold }]}>
              <Feather name="camera" size={40} color={colors.gold} />
            </View>
            <Text style={[s.permTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
            {/* Gold rule (batch 124) — extends the editorial motif into the
                camera permission gate, the only remaining first-impression
                hero moment without it. permBody has alignItems:'center' so
                the View is centered horizontally by the parent. Tighter
                negative marginTop pulls the rule up into the gap:20 rhythm
                so it sits close to the Playfair title (matching the
                title-flourish reading of partners/membership/privacy heroes
                where rule and title visually pair). */}
            <TitleRule width={32} style={{ marginTop: -12 }} />
            <Text style={[s.permSub, { color: colors.mutedForeground }]}>
              Simon Yarrell uses your camera to show outfits on your body in real time — nothing is recorded or stored.
            </Text>
            <Pressable onPress={requestPermission} style={[s.goldBtn, { backgroundColor: colors.gold }]}>
              <Feather name="camera" size={15} color="#0B0B0C" />
              <Text style={s.goldBtnText}>ALLOW CAMERA</Text>
            </Pressable>
            <Pressable onPress={() => safeBack()} style={s.ghostBtn}>
              <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── LIVE AR TRY-ON ────────────────────────────────────────────────────
  return (
    <View style={s.screen}>

      {/* ── LAYER 1: Live camera — full screen ── */}
      {isNative ? (
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.webFallback]}>
          {/* Web has no camera — surface a gendered editorial still so the
              try-on surface still feels like the luxury app rather than a
              dead grey box. Opacity 0.45 (higher than mobile permission
              gate since this is a permanent state, not a one-tap dismissal). */}
          <Image
            source={editorialBackdrop}
            style={s.webFallbackBackdrop}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.58)", "rgba(11,11,12,0.84)", "rgba(11,11,12,0.94)"]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.webFallbackContent}>
            <Feather name="camera" size={48} color="rgba(198,167,94,0.5)" />
            <Text style={s.webFallbackText}>Live camera preview on device</Text>
          </View>
        </View>
      )}

      {/*
       * ── LAYER 2: Outfit overlay ──
       *
       * The outfit photo is a full-body shot (face + clothes + shoes).
       * We clip to a window that starts below the user's face zone so only
       * the CLOTHING portion of the photo is visible — the user sees their
       * own face through the live camera at the top.
       *
       * Inside the clip container the image is shifted up by PHOTO_FACE_CROP
       * so the model's face (top of the photo) is scrolled out of view and
       * only the shirt / pants / shoes portion is rendered.
       *
       * verticalOffset lets the user slide the clothes up/down to align
       * with their own body.
       */}
      <Animated.View
        style={[
          s.outfitClipWindow,
          { top: FACE_ZONE + verticalOffset, opacity: Animated.multiply(lookFade, overlayOpacity) },
        ]}
        pointerEvents="none"
      >
        {(() => {
          const pieces = activeLook.pieces;
          const dress = pieces.find((p) => p.category === "Dress");
          const outer = pieces.find((p) => p.category === "Outerwear");
          const top = pieces.find((p) => p.category === "Top");
          const bottom = pieces.find((p) => p.category === "Bottom");
          const shoes = pieces.find((p) => p.category === "Shoes");
          const torso = dress ?? outer ?? top;
          return (
            <View style={s.garmentStack}>
              {torso?.imageUrl && (
                <Image
                  source={{ uri: torso.imageUrl }}
                  style={StyleSheet.flatten([s.garmentLayer, dress ? s.garmentDress : s.garmentTop])}
                  resizeMode="contain"
                />
              )}
              {!dress && bottom?.imageUrl && (
                <Image
                  source={{ uri: bottom.imageUrl }}
                  style={StyleSheet.flatten([s.garmentLayer, s.garmentBottom])}
                  resizeMode="contain"
                />
              )}
              {shoes?.imageUrl && (
                <Image
                  source={{ uri: shoes.imageUrl }}
                  style={StyleSheet.flatten([s.garmentLayer, s.garmentShoes])}
                  resizeMode="contain"
                />
              )}
            </View>
          );
        })()}
      </Animated.View>

      {/* ── LAYER 3: Subtle gradient scrim at face/clothes boundary ── */}
      <LinearGradient
        colors={["rgba(5,5,6,0.0)", "rgba(5,5,6,0.0)", "rgba(5,5,6,0.0)"]}
        style={StyleSheet.flatten([s.boundaryFade, { top: FACE_ZONE - 24 + verticalOffset }])}
        pointerEvents="none"
      />

      {/* ── LAYER 4: Top & bottom scrims ── */}
      <LinearGradient
        colors={["rgba(5,5,6,0.75)", "rgba(5,5,6,0.15)", "transparent"]}
        locations={[0, 0.3, 1]}
        style={s.topScrim}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(5,5,6,0.6)", "rgba(5,5,6,0.97)"]}
        locations={[0, 0.3, 1]}
        style={s.bottomScrim}
        pointerEvents="none"
      />

      {/* ── LAYER 5: UI chrome ── */}

      {/* Top bar */}
      <Animated.View style={[s.topBar, { paddingTop: topPad + 8, opacity: fadeAnim }]}>
        <BrandWordmark style={{ opacity: 0.95 }} />
        <View style={s.topActions}>
          <Pressable onPress={flipCamera} hitSlop={10} style={s.iconBtn}>
            <Feather name="refresh-cw" size={15} color="#F5F5F0" />
          </Pressable>
          <Pressable onPress={() => safeBack()} hitSlop={10} style={s.iconBtn}>
            <Feather name="x" size={15} color="#F5F5F0" />
          </Pressable>
        </View>
      </Animated.View>

      {/* LIVE badge — bottom left of face zone */}
      <Animated.View style={[s.liveBadge, { top: topPad + 62 }, { opacity: fadeAnim }]}>
        <View style={s.liveDot} />
        <Text style={s.liveBadgeText}>LIVE</Text>
      </Animated.View>

      {/* Right-side controls: opacity + position nudge */}
      <Animated.View style={[s.sideControls, { top: topPad + 55 }, { opacity: fadeAnim }]}>
        {/* Opacity levels */}
        <View style={s.sideGroup}>
          {(["vivid", "blend", "sheer"] as OpacityLevel[]).map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => changeOpacity(lvl)}
              style={[s.sideBtn, opacityLevel === lvl && s.sideBtnActive]}
            >
              <Text style={[s.sideBtnText, opacityLevel === lvl && s.sideBtnTextActive]}>
                {lvl === "vivid" ? "100%" : lvl === "blend" ? "65%" : "35%"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Spacer */}
        <View style={{ height: 12 }} />

        {/* Position nudge — move outfit up/down */}
        <View style={s.sideGroup}>
          <Pressable onPress={() => nudge("up")} style={s.sideBtn} hitSlop={6}>
            <Feather name="chevron-up" size={13} color="rgba(245,245,240,0.7)" />
          </Pressable>
          <View style={s.sideDivider} />
          <Pressable onPress={() => nudge("down")} style={s.sideBtn} hitSlop={6}>
            <Feather name="chevron-down" size={13} color="rgba(245,245,240,0.7)" />
          </Pressable>
        </View>
      </Animated.View>

      {/* Alignment hint — shows when user hasn't nudged yet */}
      {verticalOffset === 0 && (
        <Animated.View
          style={[s.alignHint, { top: FACE_ZONE - 2 }, { opacity: fadeAnim }]}
          pointerEvents="none"
        >
          <View style={s.alignLine} />
          <Text style={s.alignHintText}>Align clothes to your body using ↑ ↓</Text>
          <View style={s.alignLine} />
        </Animated.View>
      )}

      {/* ── Bottom panel ── */}
      <Animated.View style={[s.panel, { opacity: fadeAnim, transform: [{ translateY: panelSlide }] }]}>

        {/* Look navigator */}
        <Animated.View style={[s.lookNav, { opacity: lookFade }]}>
          <Pressable onPress={() => switchLook("prev")} style={s.navArrow}>
            <Feather name="chevron-left" size={20} color="#F5F5F0" />
          </Pressable>
          <View style={s.lookMeta}>
            <Text style={s.lookNavName} numberOfLines={1}>{activeLook.name}</Text>
            {/* Style label is tappable when it matches a known TREND →
                /style with trendHint pre-loaded (batch 73). Fail-closed:
                if the look's style isn't in TRENDS (legacy/free-form
                strings), it stays a flat Text — same mesh contract as
                LookCard styleTag (batch 68) and look-detail style pill. */}
            {TRENDS.some((t) => t.name === activeLook.style) ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: "/(tabs)/style", params: { trendHint: activeLook.style } });
                }}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${activeLook.style} trend`}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
              >
                <Text style={[s.lookNavStyle, { color: "rgba(245,245,240,0.85)" }]}>
                  {activeLook.style}
                </Text>
              </Pressable>
            ) : (
              <Text style={s.lookNavStyle}>{activeLook.style}</Text>
            )}
          </View>
          <Pressable onPress={() => switchLook("next")} style={s.navArrow}>
            <Feather name="chevron-right" size={20} color="#F5F5F0" />
          </Pressable>
        </Animated.View>

        {/* Dot indicators */}
        <View style={s.dots}>
          {availableLooks.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => { Haptics.selectionAsync(); setActiveLookIdx(i); }}
              style={[
                s.dot,
                { backgroundColor: i === activeLookIdx ? "#C6A75E" : "rgba(245,245,240,0.2)" },
                i === activeLookIdx && { width: 20 },
              ]}
            />
          ))}
        </View>

        {/* Pieces strip */}
        <Animated.View style={{ opacity: lookFade }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pieces}>
            {activeLook.pieces.map((piece) => {
              // Brand micro-label is tappable when in catalog → shop with
              // brand filter (batch 73). Fail-closed: out-of-catalog brand
              // stays a flat muted Text — never a broken nav from the
              // camera UI. Brightness shift (0.45 → 0.85) + pressed
              // opacity is the affordance signal; no chevron because the
              // pieces strip is dense and chrome would crowd it.
              const shoppable = brandCatalog.has(piece.brand.toLowerCase());
              return (
                <View key={piece.id} style={s.piece}>
                  <View style={s.pieceThumb}>
                    {piece.localImage ? (
                      <Image source={piece.localImage} style={s.pieceImg} resizeMode="cover" />
                    ) : piece.imageUrl ? (
                      <Image source={{ uri: piece.imageUrl }} style={s.pieceImg} resizeMode="cover" />
                    ) : (
                      <Feather name="tag" size={14} color="rgba(245,245,240,0.3)" />
                    )}
                  </View>
                  <Text style={s.pieceName} numberOfLines={2}>{piece.name}</Text>
                  {shoppable ? (
                    <Pressable
                      onPress={() => goShopBrand(piece.brand)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Shop ${piece.brand}`}
                      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                    >
                      <Text style={[s.pieceBrand, { color: "rgba(245,245,240,0.85)" }]} numberOfLines={1}>
                        {piece.brand}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={s.pieceBrand} numberOfLines={1}>{piece.brand}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Price row */}
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>LOOK TOTAL</Text>
          <Animated.Text style={[s.priceValue, { opacity: lookFade }]}>
            ${activeLook.estimatedPrice?.toLocaleString() ?? "—"}
          </Animated.Text>
        </View>

        {/* Actions */}
        <View style={[s.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={flipCamera} style={s.outlineBtn}>
            <Feather name="refresh-cw" size={14} color="rgba(245,245,240,0.7)" />
            <Text style={s.outlineBtnText}>FLIP</Text>
          </Pressable>
          <Pressable onPress={shareStyleCard} style={s.goldBtn2}>
            <Feather name="share-2" size={14} color="#0B0B0C" />
            <Text style={s.goldBtnText2}>SHARE LOOK</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050506" },

  webFallback: {
    backgroundColor: "#0B0B0C",
    overflow: "hidden",
  },
  webFallbackBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.45,
  },
  webFallbackContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  webFallbackText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,245,240,0.55)",
    letterSpacing: 0.5,
  },

  // ── Outfit overlay ─────────────────────────────────────────────────
  // Clipping window — only the clothing zone is visible, face zone stays clear
  outfitClipWindow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  // The actual outfit photo — shifted up inside the clip window to crop model's face
  outfitImage: {
    position: "absolute",
    left: 0,
    width: "100%",
  },

  // ── Garment stack (product photos composed over body) ─────────────
  garmentStack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  garmentLayer: {
    position: "absolute",
    left: "10%",
    right: "10%",
    width: "80%",
  },
  garmentTop: {
    top: "2%",
    height: "38%",
  },
  garmentBottom: {
    top: "38%",
    height: "42%",
  },
  garmentDress: {
    top: "2%",
    height: "78%",
  },
  garmentShoes: {
    left: "22%",
    right: "22%",
    width: "56%",
    bottom: "2%",
    height: "16%",
  },

  // Thin gradient at the face/clothes boundary to smooth the transition
  boundaryFade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 48,
    zIndex: 3,
  },

  // Scrims
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 4,
  },
  bottomScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.62,
    zIndex: 4,
  },

  // ── Top bar ────────────────────────────────────────────────────────
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(5,5,6,0.5)",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── LIVE badge ─────────────────────────────────────────────────────
  liveBadge: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(5,5,6,0.5)",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C6A75E" },
  liveBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2, color: "#C6A75E" },

  // ── Side controls (right rail) ─────────────────────────────────────
  sideControls: {
    position: "absolute",
    right: 14,
    zIndex: 10,
    gap: 0,
    alignItems: "center",
  },
  sideGroup: {
    backgroundColor: "rgba(5,5,6,0.55)",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.15)",
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
  },
  sideBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  sideBtnActive: {
    backgroundColor: "rgba(198,167,94,0.2)",
  },
  sideBtnText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    color: "rgba(245,245,240,0.45)",
  },
  sideBtnTextActive: { color: "#C6A75E" },
  sideDivider: {
    height: 0.5,
    width: 28,
    backgroundColor: "rgba(245,245,240,0.12)",
  },

  // ── Alignment hint ─────────────────────────────────────────────────
  alignHint: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  alignLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "rgba(198,167,94,0.4)",
  },
  alignHintText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "rgba(198,167,94,0.7)",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // ── Bottom panel ───────────────────────────────────────────────────
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    gap: 14,
    paddingTop: 16,
  },
  lookNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  navArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(5,5,6,0.45)",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lookMeta: { flex: 1, alignItems: "center", gap: 3 },
  lookNavName: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F5F0",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  lookNavStyle: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(245,245,240,0.5)",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  dot: { height: 4, width: 4, borderRadius: 2 },
  pieces: { paddingHorizontal: 16, gap: 10 },
  piece: { width: 80, gap: 5 },
  pieceThumb: {
    width: 80,
    height: 80,
    borderRadius: 2,
    backgroundColor: "rgba(245,245,240,0.08)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.12)",
  },
  pieceImg: { width: "100%", height: "100%" },
  pieceName: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#F5F5F0", lineHeight: 13 },
  pieceBrand: { fontSize: 8, fontFamily: "Inter_400Regular", color: "rgba(245,245,240,0.45)" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(245,245,240,0.1)",
  },
  priceLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "rgba(245,245,240,0.4)", letterSpacing: 2 },
  priceValue: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", color: "#C6A75E" },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.2)",
  },
  outlineBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(245,245,240,0.7)", letterSpacing: 1.5 },
  goldBtn2: {
    flex: 2.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
    backgroundColor: "#C6A75E",
  },
  goldBtnText2: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0B0B0C", letterSpacing: 1.5 },

  // ── Permission screen ──────────────────────────────────────────────
  permBodyWrap: {
    flex: 1,
    overflow: "hidden",
  },
  permBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.32,
  },
  permBody: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  permCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  permTitle: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  permSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  goldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 2,
    width: "100%",
    marginTop: 8,
  },
  goldBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2, color: "#0B0B0C" },
  ghostBtn: { paddingVertical: 12 },
  ghostBtnText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
