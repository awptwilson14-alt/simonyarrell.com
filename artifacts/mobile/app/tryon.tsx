import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Stage = "landing" | "capturing" | "studio";

const HOW_IT_WORKS = [
  { icon: "camera", label: "Take a photo", desc: "Full-length selfie works best" },
  { icon: "layers", label: "Pick your look", desc: "Browse curated Maison Simon looks" },
  { icon: "share-2", label: "Style & share", desc: "Save your editorial style card" },
];

export default function TryOnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();

  const [stage, setStage] = useState<Stage>("landing");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [activeLookIdx, setActiveLookIdx] = useState(() => {
    if (lookId) {
      const idx = LOOKS.findIndex((l) => l.id === lookId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const native = Platform.OS !== "web";
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: native }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: native }),
    ]).start();
  }, [stage]);

  const activeLook = LOOKS[activeLookIdx];

  const requestPermission = async (source: "camera" | "library"): Promise<boolean> => {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Access",
          "Please allow camera access in your device settings to use Virtual Try-On.",
          [{ text: "OK" }]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Photo Library Access",
          "Please allow photo library access to choose a photo.",
          [{ text: "OK" }]
        );
        return false;
      }
    }
    return true;
  };

  const openCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await requestPermission("camera");
    if (!ok) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.9,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        fadeAnim.setValue(0);
        slideAnim.setValue(40);
        setStage("studio");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  };

  const openGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await requestPermission("library");
    if (!ok) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        fadeAnim.setValue(0);
        slideAnim.setValue(40);
        setStage("studio");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  };

  const retake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setStage("landing");
    setPhotoUri(null);
  };

  const shareStyleCard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `✨ Just tried on the "${activeLook.name}" look on Maison Simon!\n\nPieces: ${activeLook.pieces.map((p) => `${p.name} by ${p.brand}`).join(", ")}\n\nTotal: $${activeLook.estimatedPrice?.toLocaleString() ?? "—"}\n\n#MaisonSimon #VirtualTryOn #LuxuryFashion`,
        title: `Maison Simon — ${activeLook.name}`,
      });
    } catch {
      // dismissed
    }
  };

  const switchLook = (dir: "prev" | "next") => {
    Haptics.selectionAsync();
    setActiveLookIdx((i) => {
      if (dir === "next") return (i + 1) % LOOKS.length;
      return (i - 1 + LOOKS.length) % LOOKS.length;
    });
  };

  const topPad = Platform.OS === "web" ? 56 : insets.top;

  // ── LANDING ──────────────────────────────────────────────────────────
  if (stage === "landing") {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        {/* Ambient gradient */}
        <LinearGradient
          colors={["rgba(198,167,94,0.08)", "transparent", "rgba(198,167,94,0.04)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Header */}
        <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
          <BrandWordmark />
          <Pressable onPress={() => router.back()} hitSlop={12} style={[s.closeBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[s.landingContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero icon */}
          <Animated.View style={[s.heroIcon, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[s.cameraCircle, { backgroundColor: colors.card, borderColor: colors.gold }]}>
              <Feather name="camera" size={44} color={colors.gold} />
            </View>
            <View style={[s.sparkle, { top: 0, right: 16 }]}>
              <Feather name="star" size={12} color={colors.gold} />
            </View>
            <View style={[s.sparkle, { bottom: 8, left: 24 }]}>
              <Feather name="star" size={8} color={colors.gold} />
            </View>
          </Animated.View>

          {/* Copy */}
          <Animated.View style={[s.heroText, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[s.eyebrow, { color: colors.gold }]}>AI STYLE STUDIO</Text>
            <Text style={[s.headline, { color: colors.foreground }]}>
              Virtual{"\n"}Try-On
            </Text>
            <Text style={[s.sub, { color: colors.mutedForeground }]}>
              Step into any look. See curated Maison Simon outfits styled against your photo — no filter needed.
            </Text>
          </Animated.View>

          {/* How it works */}
          <View style={[s.howSection, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            {HOW_IT_WORKS.map((step, i) => (
              <View key={step.icon} style={s.howRow}>
                <View style={[s.howNum, { backgroundColor: colors.card, borderColor: colors.gold }]}>
                  <Text style={[s.howNumText, { color: colors.gold }]}>{i + 1}</Text>
                </View>
                <View style={s.howInfo}>
                  <Text style={[s.howLabel, { color: colors.foreground }]}>{step.label}</Text>
                  <Text style={[s.howDesc, { color: colors.mutedForeground }]}>{step.desc}</Text>
                </View>
                <Feather name={step.icon as any} size={18} color={colors.border} />
              </View>
            ))}
          </View>

          {/* CTAs */}
          <View style={s.ctas}>
            <Pressable
              onPress={openCamera}
              disabled={loading}
              style={[s.primaryBtn, { backgroundColor: colors.gold }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0B0B0C" />
              ) : (
                <>
                  <Feather name="camera" size={16} color="#0B0B0C" />
                  <Text style={s.primaryBtnText}>OPEN CAMERA</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={openGallery}
              disabled={loading}
              style={[s.outlineBtn, { borderColor: colors.border }]}
            >
              <Feather name="image" size={16} color={colors.foreground} />
              <Text style={[s.outlineBtnText, { color: colors.foreground }]}>CHOOSE FROM LIBRARY</Text>
            </Pressable>

            <Text style={[s.privacy, { color: colors.mutedForeground }]}>
              📷 Your photo never leaves your device
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── STUDIO ────────────────────────────────────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: "#050506" }]}>
      {/* User photo — fills top 58% */}
      {photoUri && (
        <Image
          source={{ uri: photoUri }}
          style={s.userPhoto}
          resizeMode="cover"
        />
      )}

      {/* Gradient overlay on photo */}
      <LinearGradient
        colors={["rgba(5,5,6,0.45)", "transparent", "rgba(5,5,6,0.8)", "#050506"]}
        locations={[0, 0.3, 0.68, 1]}
        style={s.photoGradient}
        pointerEvents="none"
      />

      {/* Top bar over photo */}
      <View style={[s.topBar, { paddingTop: topPad + 8, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }]}>
        <BrandWordmark style={{ opacity: 0.95 }} />
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.closeBtn, { borderColor: "rgba(245,245,240,0.25)", backgroundColor: "rgba(5,5,6,0.5)" }]}>
          <Feather name="x" size={16} color="#F5F5F0" />
        </Pressable>
      </View>

      {/* Studio editing label */}
      <View style={[s.studioLabel, { top: topPad + 52 }]}>
        <View style={[s.studioTag, { backgroundColor: "rgba(198,167,94,0.15)", borderColor: "rgba(198,167,94,0.4)" }]}>
          <Feather name="zap" size={9} color="#C6A75E" />
          <Text style={s.studioTagText}>TRYING ON</Text>
        </View>
      </View>

      {/* Bottom panel */}
      <Animated.View
        style={[
          s.panel,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Look nav */}
        <View style={s.lookNav}>
          <Pressable onPress={() => switchLook("prev")} style={[s.navArrow, { borderColor: "rgba(245,245,240,0.15)" }]}>
            <Feather name="chevron-left" size={18} color="#F5F5F0" />
          </Pressable>

          <View style={s.lookMeta}>
            <Text style={s.lookNavName}>{activeLook.name}</Text>
            <Text style={s.lookNavStyle}>{activeLook.style}</Text>
          </View>

          <Pressable onPress={() => switchLook("next")} style={[s.navArrow, { borderColor: "rgba(245,245,240,0.15)" }]}>
            <Feather name="chevron-right" size={18} color="#F5F5F0" />
          </Pressable>
        </View>

        {/* Dot indicators */}
        <View style={s.dots}>
          {LOOKS.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => { Haptics.selectionAsync(); setActiveLookIdx(i); }}
              style={[
                s.dot,
                { backgroundColor: i === activeLookIdx ? "#C6A75E" : "rgba(245,245,240,0.25)" },
                i === activeLookIdx && { width: 20 },
              ]}
            />
          ))}
        </View>

        {/* Pieces strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pieces}
        >
          {activeLook.pieces.map((piece) => (
            <View key={piece.id} style={s.piece}>
              <View style={s.pieceThumb}>
                {piece.imageUrl ? (
                  <Image
                    source={{ uri: piece.imageUrl }}
                    style={s.pieceImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="tag" size={16} color="rgba(245,245,240,0.3)" />
                )}
              </View>
              <Text style={s.pieceName} numberOfLines={2}>{piece.name}</Text>
              <Text style={s.pieceBrand} numberOfLines={1}>{piece.brand}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Price + divider */}
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>LOOK TOTAL</Text>
          <Text style={s.priceValue}>
            ${activeLook.estimatedPrice?.toLocaleString() ?? "—"}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={[s.actions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={retake} style={s.retakeBtn}>
            <Feather name="camera" size={15} color="rgba(245,245,240,0.7)" />
            <Text style={s.retakeBtnText}>RETAKE</Text>
          </Pressable>

          <Pressable onPress={shareStyleCard} style={[s.shareBtn, { backgroundColor: "#C6A75E" }]}>
            <Feather name="share-2" size={15} color="#0B0B0C" />
            <Text style={s.shareBtnText}>SHARE STYLE CARD</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },

  // Landing
  landingContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 32,
  },
  heroIcon: {
    alignItems: "center",
    marginTop: 8,
  },
  cameraCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
  },
  heroText: {
    gap: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  headline: {
    fontSize: 48,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
    lineHeight: 54,
  },
  sub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  howSection: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    paddingVertical: 4,
    gap: 2,
  },
  howRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  howNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  howNumText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  howInfo: {
    flex: 1,
    gap: 2,
  },
  howLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  howDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  ctas: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 2,
  },
  primaryBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#0B0B0C",
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  outlineBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  privacy: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // Studio
  userPhoto: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.62,
  },
  photoGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.72,
  },
  studioLabel: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  studioTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  studioTagText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#C6A75E",
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    gap: 16,
  },
  lookNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  lookMeta: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  lookNavName: {
    fontSize: 20,
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
  piece: {
    width: 88,
    gap: 6,
  },
  pieceThumb: {
    width: 88,
    height: 88,
    borderRadius: 2,
    backgroundColor: "rgba(245,245,240,0.08)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(245,245,240,0.12)",
  },
  pieceImg: {
    width: "100%",
    height: "100%",
  },
  pieceName: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#F5F5F0",
    lineHeight: 14,
  },
  pieceBrand: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,245,240,0.5)",
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
    color: "rgba(245,245,240,0.45)",
    letterSpacing: 2,
  },
  priceValue: {
    fontSize: 18,
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
    flex: 2,
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
});
