import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { safeBack } from "../lib/nav";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "@/lib/safeWebShims";
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
import { TitleRule } from "@/components/TitleRule";
import { LOOKS, filterLooksForProfile } from "@/constants/data";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  composeTryOn,
  TryOnError,
  type PersonMimeType,
} from "@/lib/tryOn";

const { height } = Dimensions.get("window");

type Mode = "intro" | "camera" | "styling" | "generating" | "result";

interface CapturedPhoto {
  uri: string;
  base64: string;
  mimeType: PersonMimeType;
}

const GENERATING_LINES = [
  "Reading your proportions…",
  "Draping each piece to your frame…",
  "Matching light and shadow…",
  "Pressing the final look…",
];

function inferMime(uri: string, provided?: string | null): PersonMimeType {
  if (provided === "image/png") return "image/png";
  if (provided === "image/webp") return "image/webp";
  if (provided === "image/jpeg") return "image/jpeg";
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function TryOnScreen() {
  const colors = useColors();
  const { userProfile } = useApp();
  const heroKey: "men" | "women" = userProfile.gender === "Men" ? "men" : "women";
  const editorialBackdrop = SPLASH_HEROES[heroKey];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lookId } = useLocalSearchParams<{ lookId?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<"front" | "back">("front");

  const [mode, setMode] = useState<Mode>("intro");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [result, setResult] = useState<string | null>(null); // data URI
  const [showBefore, setShowBefore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [genLine, setGenLine] = useState(0);

  // Gender-filtered look pool — a Men profile can't try on a women's look.
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
  const activeLook = availableLooks[activeLookIdx];

  const isNative = Platform.OS !== "web";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: isNative }).start();
  }, [mode]);

  // Cycle the generating copy + run the ring spinner.
  useEffect(() => {
    if (mode !== "generating") return;
    setGenLine(0);
    const int = setInterval(() => setGenLine((l) => (l + 1) % GENERATING_LINES.length), 2200);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1400, useNativeDriver: isNative }),
    );
    loop.start();
    return () => {
      clearInterval(int);
      loop.stop();
      spin.setValue(0);
    };
  }, [mode]);

  const topPad = Platform.OS === "web" ? 56 : insets.top;

  // ── Photo sources ──────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    Haptics.selectionAsync();
    setErrorMsg(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.canAskAgain === false) {
        setErrorMsg("Photo library access is turned off. Enable it in Settings to upload a photo.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]?.base64) return;
      const asset = res.assets[0];
      setPhoto({
        uri: asset.uri,
        base64: asset.base64!,
        mimeType: inferMime(asset.uri, asset.mimeType),
      });
      setResult(null);
      setMode("styling");
    } catch {
      setErrorMsg("Couldn't open your photo library. Please try again.");
    }
  };

  const openCamera = async () => {
    Haptics.selectionAsync();
    setErrorMsg(null);
    if (!permission?.granted) {
      const req = await requestPermission();
      if (!req.granted) return;
    }
    setMode("camera");
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      if (shot?.base64) {
        setPhoto({ uri: shot.uri, base64: shot.base64, mimeType: "image/jpeg" });
        setResult(null);
        setMode("styling");
      }
    } catch {
      setErrorMsg("Couldn't capture the photo. Try uploading one instead.");
      setMode("intro");
    } finally {
      setCapturing(false);
    }
  };

  // ── Generate ───────────────────────────────────────────────────────
  const garmentUrls = activeLook.pieces
    .map((p) => p.imageUrl)
    .filter((u): u is string => typeof u === "string" && u.length > 0)
    .slice(0, 6);

  const runTryOn = async () => {
    if (!photo || garmentUrls.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg(null);
    setMode("generating");
    try {
      const out = await composeTryOn({
        personImage: photo.base64,
        personMimeType: photo.mimeType,
        garmentImageUrls: garmentUrls,
        lookName: activeLook.name,
        gender: userProfile.gender === "Men" ? "Men" : userProfile.gender === "Women" ? "Women" : "Unisex",
      });
      setResult(out.dataUri);
      setShowBefore(false);
      setMode("result");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg =
        err instanceof TryOnError
          ? err.message
          : "Something went wrong composing your try-on.";
      setErrorMsg(msg);
      setMode("styling");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const switchLook = (dir: "prev" | "next") => {
    Haptics.selectionAsync();
    setActiveLookIdx((i) =>
      dir === "next"
        ? (i + 1) % availableLooks.length
        : (i - 1 + availableLooks.length) % availableLooks.length,
    );
  };

  const shareResult = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `✨ I tried on the "${activeLook.name}" look on Maison Simon.\n\n${activeLook.pieces
          .map((p) => `${p.name} — ${p.brand}`)
          .join("\n")}\n\nTotal: $${activeLook.estimatedPrice?.toLocaleString() ?? "—"}\n\n#MaisonSimon #VirtualTryOn`,
        title: `Maison Simon — ${activeLook.name}`,
      });
    } catch {
      /* dismissed */
    }
  };

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  // ── Shared top bar ─────────────────────────────────────────────────
  const TopBar = ({ onClose }: { onClose: () => void }) => (
    <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
      <BrandWordmark style={{ opacity: 0.95 }} />
      <Pressable onPress={onClose} hitSlop={12} style={[s.iconBtn, { borderColor: colors.border }]}>
        <Feather name="x" size={16} color="#F5F5F0" />
      </Pressable>
    </View>
  );

  // ── CAMERA MODE ────────────────────────────────────────────────────
  if (mode === "camera") {
    return (
      <View style={s.screen}>
        {isNative || Platform.OS === "web" ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
        ) : null}
        <LinearGradient
          colors={["rgba(5,5,6,0.7)", "transparent"]}
          style={s.topScrim}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", "rgba(5,5,6,0.85)"]}
          style={s.bottomScrim}
          pointerEvents="none"
        />
        <TopBar onClose={() => setMode("intro")} />

        {/* Framing guide */}
        <View style={s.frameGuide} pointerEvents="none">
          <Text style={s.frameGuideText}>Stand back so your full body is in frame</Text>
        </View>

        {/* Shutter row */}
        <View style={[s.cameraControls, { paddingBottom: insets.bottom + 28 }]}>
          <Pressable onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))} style={s.circleBtn}>
            <Feather name="refresh-cw" size={18} color="#F5F5F0" />
          </Pressable>
          <Pressable onPress={capturePhoto} style={s.shutter} disabled={capturing}>
            {capturing ? (
              <ActivityIndicator color="#0B0B0C" />
            ) : (
              <View style={s.shutterInner} />
            )}
          </Pressable>
          <Pressable onPress={pickFromLibrary} style={s.circleBtn}>
            <Feather name="image" size={18} color="#F5F5F0" />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── GENERATING MODE ────────────────────────────────────────────────
  if (mode === "generating") {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <Image source={editorialBackdrop} style={s.introBackdrop} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(11,11,12,0.82)", "rgba(11,11,12,0.94)", "rgba(11,11,12,0.98)"]}
          style={StyleSheet.absoluteFill}
        />
        <TopBar onClose={() => setMode("styling")} />
        <View style={s.centerBody}>
          <Animated.View style={[s.genRing, { transform: [{ rotate: spinDeg }] }]}>
            <View style={s.genRingDot} />
          </Animated.View>
          <Text style={[s.genTitle, { color: colors.foreground }]}>Tailoring your look</Text>
          <TitleRule width={32} style={{ marginTop: 2 }} />
          <Text style={[s.genLine, { color: colors.mutedForeground }]}>{GENERATING_LINES[genLine]}</Text>
          <Text style={s.genHint}>This can take up to a minute — couture takes patience.</Text>
        </View>
      </View>
    );
  }

  // ── RESULT MODE ────────────────────────────────────────────────────
  if (mode === "result" && result) {
    return (
      <View style={[s.screen, { backgroundColor: "#050506" }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <Image
            source={{ uri: showBefore && photo ? photo.uri : result }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
        </Animated.View>
        <LinearGradient
          colors={["rgba(5,5,6,0.8)", "transparent"]}
          style={s.topScrim}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", "rgba(5,5,6,0.5)", "rgba(5,5,6,0.96)"]}
          locations={[0, 0.4, 1]}
          style={s.resultBottomScrim}
          pointerEvents="none"
        />
        <TopBar onClose={() => safeBack()} />

        {/* Before / After toggle */}
        {photo && (
          <Pressable
            onPressIn={() => setShowBefore(true)}
            onPressOut={() => setShowBefore(false)}
            style={[s.beforePill, { top: topPad + 58 }]}
          >
            <Feather name="eye" size={12} color="#0B0B0C" />
            <Text style={s.beforePillText}>{showBefore ? "ORIGINAL" : "HOLD TO COMPARE"}</Text>
          </Pressable>
        )}

        {/* Bottom panel */}
        <View style={[s.resultPanel, { paddingBottom: insets.bottom + 18 }]}>
          <Text style={s.resultLookName} numberOfLines={1}>{activeLook.name}</Text>
          <Text style={s.resultTotal}>
            ${activeLook.estimatedPrice?.toLocaleString() ?? "—"}
          </Text>
          <View style={s.resultActions}>
            <Pressable onPress={() => { Haptics.selectionAsync(); setResult(null); setMode("styling"); }} style={s.outlineBtn}>
              <Feather name="grid" size={14} color="rgba(245,245,240,0.8)" />
              <Text style={s.outlineBtnText}>ANOTHER LOOK</Text>
            </Pressable>
            <Pressable onPress={shareResult} style={s.goldBtn}>
              <Feather name="share-2" size={14} color="#0B0B0C" />
              <Text style={s.goldBtnText}>SHARE</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => { Haptics.selectionAsync(); setResult(null); setPhoto(null); setMode("intro"); }} style={s.ghostRow}>
            <Feather name="camera" size={12} color="rgba(245,245,240,0.5)" />
            <Text style={s.ghostRowText}>New photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── STYLING MODE ───────────────────────────────────────────────────
  if (mode === "styling" && photo) {
    const canGenerate = garmentUrls.length > 0;
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <TopBar onClose={() => safeBack()} />
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }} showsVerticalScrollIndicator={false}>
          {/* Photo hero */}
          <View style={s.photoHeroWrap}>
            <Image source={{ uri: photo.uri }} style={s.photoHero} resizeMode="cover" />
            <LinearGradient colors={["transparent", "rgba(11,11,12,0.9)"]} style={s.photoHeroFade} pointerEvents="none" />
            <Pressable onPress={() => { setPhoto(null); setMode("intro"); }} style={s.retakeChip}>
              <Feather name="refresh-cw" size={12} color="#F5F5F0" />
              <Text style={s.retakeChipText}>Change photo</Text>
            </Pressable>
          </View>

          <View style={s.stylingBody}>
            <Text style={[s.sectionKicker, { color: colors.gold }]}>CHOOSE A LOOK</Text>
            <TitleRule width={28} style={{ marginTop: 4, marginBottom: 14 }} />

            {/* Look navigator */}
            <View style={s.lookNav}>
              <Pressable onPress={() => switchLook("prev")} style={s.navArrow}>
                <Feather name="chevron-left" size={22} color={colors.foreground} />
              </Pressable>
              <View style={s.lookMeta}>
                <Text style={[s.lookName, { color: colors.foreground }]} numberOfLines={1}>{activeLook.name}</Text>
                <Text style={[s.lookStyle, { color: colors.mutedForeground }]}>{activeLook.style}</Text>
              </View>
              <Pressable onPress={() => switchLook("next")} style={s.navArrow}>
                <Feather name="chevron-right" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Dots */}
            <View style={s.dots}>
              {availableLooks.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => { Haptics.selectionAsync(); setActiveLookIdx(i); }}
                  style={[
                    s.dot,
                    { backgroundColor: i === activeLookIdx ? colors.gold : "rgba(245,245,240,0.2)" },
                    i === activeLookIdx && { width: 20 },
                  ]}
                />
              ))}
            </View>

            {/* Pieces strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pieces}>
              {activeLook.pieces.map((piece) => (
                <View key={piece.id} style={s.piece}>
                  <View style={[s.pieceThumb, { borderColor: colors.border }]}>
                    {piece.localImage ? (
                      <Image source={piece.localImage} style={s.pieceImg} resizeMode="cover" />
                    ) : piece.imageUrl ? (
                      <Image source={{ uri: piece.imageUrl }} style={s.pieceImg} resizeMode="cover" />
                    ) : (
                      <Feather name="tag" size={14} color="rgba(245,245,240,0.3)" />
                    )}
                  </View>
                  <Text style={[s.pieceName, { color: colors.foreground }]} numberOfLines={2}>{piece.name}</Text>
                  <Text style={[s.pieceBrand, { color: colors.mutedForeground }]} numberOfLines={1}>{piece.brand}</Text>
                </View>
              ))}
            </ScrollView>

            {errorMsg && (
              <View style={[s.errorBox, { borderColor: "rgba(198,167,94,0.4)" }]}>
                <Feather name="alert-circle" size={13} color={colors.gold} />
                <Text style={[s.errorText, { color: colors.foreground }]}>{errorMsg}</Text>
              </View>
            )}
            {!canGenerate && (
              <Text style={[s.noGarmentNote, { color: colors.mutedForeground }]}>
                This look doesn't have shoppable images to try on. Pick another look.
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[s.ctaBar, { paddingBottom: insets.bottom + 14, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={runTryOn}
            disabled={!canGenerate}
            style={[s.goldBtnLg, { backgroundColor: colors.gold }, !canGenerate && { opacity: 0.4 }]}
          >
            <Feather name="zap" size={16} color="#0B0B0C" />
            <Text style={s.goldBtnLgText}>CREATE MY TRY-ON</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── INTRO MODE (default) ───────────────────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <Image source={editorialBackdrop} style={s.introBackdrop} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(11,11,12,0.55)", "rgba(11,11,12,0.86)", "rgba(11,11,12,0.97)"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TopBar onClose={() => safeBack()} />
      <Animated.View style={[s.introBody, { opacity: fadeAnim, paddingBottom: insets.bottom + 24 }]}>
        <View style={[s.introCircle, { borderColor: colors.gold, backgroundColor: colors.card }]}>
          <Feather name="user" size={38} color={colors.gold} />
        </View>
        <Text style={[s.introTitle, { color: colors.foreground }]}>Virtual Try-On</Text>
        <TitleRule width={36} style={{ marginTop: -6 }} />
        <Text style={[s.introSub, { color: colors.mutedForeground }]}>
          Take or upload a full-body photo and our AI atelier will drape any look onto you —
          realistic fit, fabric, and light. Your photo is used only to render this image.
        </Text>

        <View style={s.introActions}>
          <Pressable onPress={openCamera} style={[s.goldBtnLg, { backgroundColor: colors.gold }]}>
            <Feather name="camera" size={16} color="#0B0B0C" />
            <Text style={s.goldBtnLgText}>TAKE A PHOTO</Text>
          </Pressable>
          <Pressable onPress={pickFromLibrary} style={[s.outlineBtnLg, { borderColor: colors.border }]}>
            <Feather name="upload" size={15} color={colors.foreground} />
            <Text style={[s.outlineBtnLgText, { color: colors.foreground }]}>UPLOAD A PHOTO</Text>
          </Pressable>
        </View>

        {errorMsg && (
          <View style={[s.errorBox, { borderColor: "rgba(198,167,94,0.4)" }]}>
            <Feather name="alert-circle" size={13} color={colors.gold} />
            <Text style={[s.errorText, { color: colors.foreground }]}>{errorMsg}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050506" },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 150, zIndex: 5 },
  bottomScrim: { position: "absolute", bottom: 0, left: 0, right: 0, height: 220, zIndex: 5 },

  // Intro
  introBackdrop: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.5 },
  introBody: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 28, gap: 16 },
  introCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  introTitle: { fontSize: 34, fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  introSub: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
    marginTop: 2,
  },
  introActions: { width: "100%", gap: 12, marginTop: 12 },

  // Buttons
  goldBtnLg: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 54,
    borderRadius: 27,
  },
  goldBtnLgText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#0B0B0C" },
  outlineBtnLg: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
  },
  outlineBtnLgText: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  // Camera
  frameGuide: { position: "absolute", top: height * 0.16, left: 0, right: 0, alignItems: "center", zIndex: 10 },
  frameGuideText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(245,245,240,0.85)",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    letterSpacing: 0.3,
  },
  cameraControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 40,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#C6A75E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#C6A75E" },

  // Generating
  centerBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 14 },
  genRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "rgba(198,167,94,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  genRingDot: { position: "absolute", top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C6A75E" },
  genTitle: { fontSize: 26, fontFamily: "PlayfairDisplay_700Bold" },
  genLine: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 8, textAlign: "center" },
  genHint: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "rgba(245,245,240,0.4)", marginTop: 4, textAlign: "center" },

  // Styling
  photoHeroWrap: { width: "100%", height: height * 0.42, backgroundColor: "#111" },
  photoHero: { width: "100%", height: "100%" },
  photoHeroFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 120 },
  retakeChip: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  retakeChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#F5F5F0" },
  stylingBody: { paddingHorizontal: 20, paddingTop: 20 },
  sectionKicker: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2.5 },

  lookNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navArrow: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  lookMeta: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  lookName: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  lookStyle: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, marginTop: 2 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  pieces: { gap: 14, paddingVertical: 20, paddingHorizontal: 2 },
  piece: { width: 74, alignItems: "center", gap: 5 },
  pieceThumb: {
    width: 74,
    height: 90,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  pieceImg: { width: "100%", height: "100%" },
  pieceName: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 12 },
  pieceBrand: { fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center" },

  noGarmentNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 12, lineHeight: 18 },

  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Result
  resultBottomScrim: { position: "absolute", bottom: 0, left: 0, right: 0, height: 280, zIndex: 5 },
  beforePill: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C6A75E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  beforePillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#0B0B0C" },
  resultPanel: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, alignItems: "center", gap: 6 },
  resultLookName: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold", color: "#F5F5F0", textAlign: "center" },
  resultTotal: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#C6A75E", marginBottom: 8 },
  resultActions: { flexDirection: "row", gap: 12, width: "100%" },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(245,245,240,0.25)",
  },
  outlineBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1, color: "rgba(245,245,240,0.85)" },
  goldBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#C6A75E",
  },
  goldBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#0B0B0C" },
  ghostRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingVertical: 4 },
  ghostRowText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(245,245,240,0.5)" },
});
