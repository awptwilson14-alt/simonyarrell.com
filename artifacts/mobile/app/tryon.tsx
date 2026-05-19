import * as Haptics from "expo-haptics";
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
import { LOOKS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

const { height } = Dimensions.get("window");

type BlendMode = "sheer" | "blend" | "vivid";
const BLEND_LEVELS: Record<BlendMode, number> = { sheer: 0.3, blend: 0.6, vivid: 0.88 };
const BLEND_LABELS: Record<BlendMode, string> = { sheer: "SHEER", blend: "BLEND", vivid: "VIVID" };

export default function TryOnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [blend, setBlend] = useState<BlendMode>("blend");

  const [activeLookIdx, setActiveLookIdx] = useState(() => {
    if (lookId) {
      const idx = LOOKS.findIndex((l) => l.id === lookId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panelSlide = useRef(new Animated.Value(60)).current;
  const lookFade = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(BLEND_LEVELS.blend)).current;

  const isNative = Platform.OS !== "web";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: isNative }),
      Animated.timing(panelSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: isNative }),
    ]).start();
  }, []);

  const switchLook = (dir: "prev" | "next") => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(lookFade, { toValue: 0, duration: 120, useNativeDriver: isNative }),
      Animated.timing(lookFade, { toValue: 1, duration: 220, useNativeDriver: isNative }),
    ]).start();
    setActiveLookIdx((i) => (dir === "next" ? (i + 1) % LOOKS.length : (i - 1 + LOOKS.length) % LOOKS.length));
  };

  const setBlendLevel = (mode: BlendMode) => {
    Haptics.selectionAsync();
    setBlend(mode);
    Animated.timing(overlayOpacity, {
      toValue: BLEND_LEVELS[mode],
      duration: 220,
      useNativeDriver: isNative,
    }).start();
  };

  const flipCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === "front" ? "back" : "front"));
  };

  const shareStyleCard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const look = LOOKS[activeLookIdx];
    try {
      await Share.share({
        message: `✨ Styled myself in the "${look.name}" look on Maison Simon!\n\nPieces: ${look.pieces.map((p) => `${p.name} by ${p.brand}`).join(", ")}\n\nTotal: $${look.estimatedPrice?.toLocaleString() ?? "—"}\n\n#MaisonSimon #VirtualTryOn #LuxuryFashion`,
        title: `Maison Simon — ${look.name}`,
      });
    } catch { /* dismissed */ }
  };

  const activeLook = LOOKS[activeLookIdx];
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  // ── PERMISSION SCREEN ──────────────────────────────────────────────────
  if (permission && !permission.granted) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["rgba(198,167,94,0.08)", "transparent"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
          <BrandWordmark />
          <Pressable onPress={() => router.back()} hitSlop={12} style={[s.iconBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={s.permBody}>
          <View style={[s.permCircle, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <Feather name="camera" size={40} color={colors.gold} />
          </View>
          <Text style={[s.permTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
          <Text style={[s.permSub, { color: colors.mutedForeground }]}>
            Maison Simon uses your camera to overlay outfits in real time — nothing is recorded or stored.
          </Text>
          <Pressable onPress={requestPermission} style={[s.goldBtn, { backgroundColor: colors.gold }]}>
            <Feather name="camera" size={15} color="#0B0B0C" />
            <Text style={s.goldBtnText}>ALLOW CAMERA</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={s.ghostBtn}>
            <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── LIVE AR TRY-ON ─────────────────────────────────────────────────────
  return (
    <View style={s.screen}>

      {/* ── LAYER 1: Live camera ── */}
      {Platform.OS !== "web" ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.webFallback]}>
          <Feather name="camera" size={48} color="rgba(198,167,94,0.3)" />
          <Text style={s.webFallbackText}>Live camera on device</Text>
        </View>
      )}

      {/* ── LAYER 2: Outfit overlay — the look image blended over camera ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(lookFade, overlayOpacity) }]}
        pointerEvents="none"
      >
        <Image
          source={activeLook.image}
          style={s.outfitOverlay}
          resizeMode="cover"
        />
      </Animated.View>

      {/* ── LAYER 3: Gradient scrims ── */}
      <LinearGradient
        colors={["rgba(5,5,6,0.72)", "rgba(5,5,6,0.1)", "transparent"]}
        locations={[0, 0.25, 1]}
        style={s.topScrim}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(5,5,6,0.55)", "rgba(5,5,6,0.97)"]}
        locations={[0, 0.28, 1]}
        style={s.bottomScrim}
        pointerEvents="none"
      />

      {/* ── LAYER 4: UI chrome ── */}

      {/* Top bar */}
      <Animated.View style={[s.topBar, { paddingTop: topPad + 8, opacity: fadeAnim }]}>
        <BrandWordmark style={{ opacity: 0.95 }} />
        <View style={s.topActions}>
          <Pressable onPress={flipCamera} hitSlop={10} style={s.iconBtn}>
            <Feather name="refresh-cw" size={15} color="#F5F5F0" />
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
            <Feather name="x" size={15} color="#F5F5F0" />
          </Pressable>
        </View>
      </Animated.View>

      {/* LIVE badge */}
      <Animated.View style={[s.liveBadge, { top: topPad + 62 }, { opacity: fadeAnim }]}>
        <View style={s.liveDot} />
        <Text style={s.liveBadgeText}>LIVE</Text>
      </Animated.View>

      {/* Blend mode switcher — top right */}
      <Animated.View style={[s.blendRow, { top: topPad + 55 }, { opacity: fadeAnim }]}>
        {(["sheer", "blend", "vivid"] as BlendMode[]).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => setBlendLevel(mode)}
            style={[
              s.blendBtn,
              blend === mode && s.blendBtnActive,
            ]}
          >
            <Text style={[s.blendBtnText, blend === mode && s.blendBtnTextActive]}>
              {BLEND_LABELS[mode]}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Bottom panel */}
      <Animated.View style={[s.panel, { opacity: fadeAnim, transform: [{ translateY: panelSlide }] }]}>

        {/* Look navigator */}
        <Animated.View style={[s.lookNav, { opacity: lookFade }]}>
          <Pressable onPress={() => switchLook("prev")} style={s.navArrow}>
            <Feather name="chevron-left" size={20} color="#F5F5F0" />
          </Pressable>
          <View style={s.lookMeta}>
            <Text style={s.lookNavName} numberOfLines={1}>{activeLook.name}</Text>
            <Text style={s.lookNavStyle}>{activeLook.style}</Text>
          </View>
          <Pressable onPress={() => switchLook("next")} style={s.navArrow}>
            <Feather name="chevron-right" size={20} color="#F5F5F0" />
          </Pressable>
        </Animated.View>

        {/* Dot indicators */}
        <View style={s.dots}>
          {LOOKS.map((_, i) => (
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pieces}
          >
            {activeLook.pieces.map((piece) => (
              <View key={piece.id} style={s.piece}>
                <View style={s.pieceThumb}>
                  {piece.imageUrl ? (
                    <Image source={{ uri: piece.imageUrl }} style={s.pieceImg} resizeMode="cover" />
                  ) : (
                    <Feather name="tag" size={14} color="rgba(245,245,240,0.3)" />
                  )}
                </View>
                <Text style={s.pieceName} numberOfLines={2}>{piece.name}</Text>
                <Text style={s.pieceBrand} numberOfLines={1}>{piece.brand}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Price row */}
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>LOOK TOTAL</Text>
          <Animated.Text style={[s.priceValue, { opacity: lookFade }]}>
            ${activeLook.estimatedPrice?.toLocaleString() ?? "—"}
          </Animated.Text>
        </View>

        {/* Action buttons */}
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
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#0B0B0C",
  },
  webFallbackText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,245,240,0.35)",
  },

  // Outfit overlay — sits directly on top of camera
  outfitOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 2,
  },
  bottomScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
    zIndex: 2,
  },

  // Top bar
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

  // LIVE badge
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
  liveBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#C6A75E",
  },

  // Blend controls
  blendRow: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    gap: 5,
  },
  blendBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.15)",
    backgroundColor: "rgba(5,5,6,0.45)",
  },
  blendBtnActive: {
    backgroundColor: "rgba(198,167,94,0.18)",
    borderColor: "rgba(198,167,94,0.5)",
  },
  blendBtnText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    color: "rgba(245,245,240,0.45)",
  },
  blendBtnTextActive: { color: "#C6A75E" },

  // Panel
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
  pieceName: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "#F5F5F0",
    lineHeight: 13,
  },
  pieceBrand: {
    fontSize: 8,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,245,240,0.45)",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(245,245,240,0.1)",
  },
  priceLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(245,245,240,0.4)",
    letterSpacing: 2,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#C6A75E",
  },
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
  outlineBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(245,245,240,0.7)",
    letterSpacing: 1.5,
  },
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
  goldBtnText2: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#0B0B0C",
    letterSpacing: 1.5,
  },

  // Permission screen
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
  permTitle: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
  },
  permSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
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
  goldBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#0B0B0C",
  },
  ghostBtn: { paddingVertical: 12 },
  ghostBtnText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
