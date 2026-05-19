import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

const { width, height } = Dimensions.get("window");

export default function TryOnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

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

  useEffect(() => {
    const native = Platform.OS !== "web";
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: native }),
      Animated.timing(panelSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: native }),
    ]).start();
  }, []);

  const switchLook = (dir: "prev" | "next") => {
    Haptics.selectionAsync();
    const native = Platform.OS !== "web";
    Animated.sequence([
      Animated.timing(lookFade, { toValue: 0, duration: 120, useNativeDriver: native }),
      Animated.timing(lookFade, { toValue: 1, duration: 200, useNativeDriver: native }),
    ]).start();
    setActiveLookIdx((i) => {
      if (dir === "next") return (i + 1) % LOOKS.length;
      return (i - 1 + LOOKS.length) % LOOKS.length;
    });
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
        message: `✨ Just tried on the "${look.name}" look on Maison Simon!\n\nPieces: ${look.pieces.map((p) => `${p.name} by ${p.brand}`).join(", ")}\n\nTotal: $${look.estimatedPrice?.toLocaleString() ?? "—"}\n\n#MaisonSimon #VirtualTryOn #LuxuryFashion`,
        title: `Maison Simon — ${look.name}`,
      });
    } catch {
      // dismissed
    }
  };

  const activeLook = LOOKS[activeLookIdx];
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  // ── PERMISSION DENIED ──────────────────────────────────────────────────
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
          <Pressable onPress={() => router.back()} hitSlop={12} style={[s.closeBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={s.permissionBody}>
          <View style={[s.permCircle, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <Feather name="camera" size={40} color={colors.gold} />
          </View>
          <Text style={[s.permTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
          <Text style={[s.permSub, { color: colors.mutedForeground }]}>
            Maison Simon uses your camera so you can preview looks on yourself in real time — no photo saved unless you share.
          </Text>
          <Pressable onPress={requestPermission} style={[s.primaryBtn, { backgroundColor: colors.gold }]}>
            <Feather name="camera" size={15} color="#0B0B0C" />
            <Text style={s.primaryBtnText}>ALLOW CAMERA</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={s.ghostBtn}>
            <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── REQUESTING / WEB FALLBACK ──────────────────────────────────────────
  const showWebFallback = Platform.OS === "web";

  // ── LIVE CAMERA VIEW ───────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* Live camera — full screen */}
      {showWebFallback ? (
        <View style={[s.webFallback, { backgroundColor: "#0B0B0C" }]}>
          <Feather name="camera" size={48} color="rgba(198,167,94,0.4)" />
          <Text style={s.webFallbackText}>Live camera preview{"\n"}available on device</Text>
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
        />
      )}

      {/* Top gradient scrim */}
      <LinearGradient
        colors={["rgba(5,5,6,0.7)", "rgba(5,5,6,0.2)", "transparent"]}
        locations={[0, 0.35, 1]}
        style={s.topScrim}
        pointerEvents="none"
      />

      {/* Bottom gradient scrim */}
      <LinearGradient
        colors={["transparent", "rgba(5,5,6,0.6)", "rgba(5,5,6,0.97)"]}
        locations={[0, 0.3, 1]}
        style={s.bottomScrim}
        pointerEvents="none"
      />

      {/* Top bar */}
      <Animated.View style={[s.topBar, { paddingTop: topPad + 8, opacity: fadeAnim }]}>
        <BrandWordmark style={{ opacity: 0.95 }} />
        <View style={s.topActions}>
          {/* Flip camera */}
          <Pressable onPress={flipCamera} hitSlop={10} style={s.iconBtn}>
            <Feather name="refresh-cw" size={16} color="#F5F5F0" />
          </Pressable>
          {/* Close */}
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
            <Feather name="x" size={16} color="#F5F5F0" />
          </Pressable>
        </View>
      </Animated.View>

      {/* LIVE badge */}
      <Animated.View style={[s.liveBadge, { top: topPad + 60 }, { opacity: fadeAnim }]}>
        <View style={s.liveDot} />
        <Text style={s.liveBadgeText}>LIVE</Text>
      </Animated.View>

      {/* Look style card — top-right corner */}
      <Animated.View style={[s.lookCard, { top: topPad + 52 }, { opacity: Animated.multiply(fadeAnim, lookFade) }]}>
        <Image source={activeLook.image} style={s.lookCardImg} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(5,5,6,0.9)"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={s.lookCardStyle}>{activeLook.style}</Text>
      </Animated.View>

      {/* Bottom panel */}
      <Animated.View
        style={[s.panel, { opacity: fadeAnim, transform: [{ translateY: panelSlide }] }]}
      >
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
          <Pressable
            onPress={flipCamera}
            style={s.retakeBtn}
          >
            <Feather name="refresh-cw" size={15} color="rgba(245,245,240,0.7)" />
            <Text style={s.retakeBtnText}>FLIP</Text>
          </Pressable>

          <Pressable
            onPress={shareStyleCard}
            disabled={capturing}
            style={[s.shareBtn, { backgroundColor: "#C6A75E", opacity: capturing ? 0.7 : 1 }]}
          >
            {capturing ? (
              <ActivityIndicator size="small" color="#0B0B0C" />
            ) : (
              <>
                <Feather name="share-2" size={15} color="#0B0B0C" />
                <Text style={s.shareBtnText}>SHARE LOOK</Text>
              </>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050506" },

  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },
  bottomScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
    zIndex: 1,
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  webFallbackText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,245,240,0.4)",
    textAlign: "center",
    lineHeight: 22,
  },

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
  topActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(5,5,6,0.45)",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },

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
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C6A75E",
  },
  liveBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#C6A75E",
  },

  lookCard: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 72,
    height: 96,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(198,167,94,0.4)",
    justifyContent: "flex-end",
  },
  lookCardImg: {
    ...StyleSheet.absoluteFillObject,
  },
  lookCardStyle: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    color: "#C6A75E",
    padding: 6,
    textTransform: "uppercase",
  },

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
    backgroundColor: "rgba(5,5,6,0.4)",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lookMeta: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
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
  dot: {
    height: 4,
    width: 4,
    borderRadius: 2,
  },
  pieces: {
    paddingHorizontal: 16,
    gap: 10,
  },
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
    letterSpacing: 0.3,
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
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  retakeBtn: {
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
  retakeBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(245,245,240,0.7)",
    letterSpacing: 1.5,
  },
  shareBtn: {
    flex: 2.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 2,
  },
  shareBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#0B0B0C",
    letterSpacing: 1.5,
  },

  // Permission screen
  permissionBody: {
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
    letterSpacing: 0.2,
  },
  permSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  primaryBtn: {
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
  primaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#0B0B0C",
  },
  ghostBtn: {
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
