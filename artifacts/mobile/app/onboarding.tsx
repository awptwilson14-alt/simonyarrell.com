import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton } from "@/components/GoldButton";
import { HeroAudio } from "@/components/HeroAudio";
import { MultiFilterChips } from "@/components/FilterChips";
import { BUDGETS, GENDERS, STYLE_CATEGORIES } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// Featured music cue for the splash only — Kenny G, "My Favorite Things".
// User explicitly asked for it to play on this welcome screen. Loaded as a
// require()-style module ref so Metro bundles it as a static asset. The
// HeroAudio component handles loop/volume/autoplay-policy/mute toggle and
// unmounts naturally when the user taps GET STARTED (which advances `step`
// past 0 and conditionally renders out this splash branch).
const WELCOME_AUDIO_SRC = require("../assets/audio/welcome.mp4");
const WELCOME_AUDIO_MUTE_KEY = "maisonSimon:welcomeAudioMuted";

const { width, height } = Dimensions.get("window");
const STEPS = 5;
const SIZES = ["S", "M", "L", "XL", "XXX", "XXXX"];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Women");
  const [size, setSize] = useState("M");
  const [budget, setBudget] = useState("$500–$1500");
  const [styles_, setStyles] = useState<string[]>([]);

  const toggleStyle = (s: string) => {
    setStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS - 1) setStep(step + 1);
    else {
      completeOnboarding({ name: name || "Guest", gender, size, budget, favoriteStyles: styles_ });
      router.replace("/(tabs)");
    }
  };

  const skip = () => {
    completeOnboarding({ name: "Guest", gender, size, budget, favoriteStyles: styles_ });
    router.replace("/(tabs)");
  };

  // ── Step 0 — Splash / Welcome ──────────────────────────────────────
  if (step === 0) {
    return (
      <View style={[splash.container, { backgroundColor: "#0B0B0C" }]}>
        <Image
          source={require("../assets/images/splash_hero.png")}
          style={splash.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(11,11,12,0.15)", "rgba(11,11,12,0.55)", "#0B0B0C"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Featured welcome music. Mounted inside the step===0 branch so it
            unmounts (and audio stops) the moment the user taps GET STARTED
            or Continue as guest and advances past the splash. */}
        <HeroAudio
          top={insets.top + 16}
          source={WELCOME_AUDIO_SRC}
          mutePrefKey={WELCOME_AUDIO_MUTE_KEY}
          defaultMuted={false}
        />

        <View style={[splash.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 48 }]}>
          {/* Brand lockup */}
          <View style={splash.brandSection}>
            <Image
              source={require("../assets/images/logo_ms.png")}
              style={splash.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* CTA */}
          <View style={splash.footer}>
            <GoldButton label="GET STARTED" onPress={next} />
            <Pressable onPress={skip} style={splash.guestBtn}>
              <Text style={[splash.guestText, { color: colors.mutedForeground }]}>
                Continue as guest
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Steps 1–3 — Profile setup ──────────────────────────────────────
  const setupSteps = [
    {
      title: "How do you\nlike to dress?",
      subtitle: "We'll personalize your experience",
      content: (
        <View style={setup.formSection}>
          <View style={setup.field}>
            <Text style={[setup.fieldLabel, { color: colors.mutedForeground }]}>YOUR NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.mutedForeground}
              style={[setup.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />
          </View>
          <View style={setup.field}>
            <Text style={[setup.fieldLabel, { color: colors.mutedForeground }]}>STYLE PROFILE</Text>
            <View style={setup.genderRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => { Haptics.selectionAsync(); setGender(g); }}
                  style={[setup.genderBtn, { backgroundColor: gender === g ? colors.gold : "transparent", borderColor: gender === g ? colors.gold : colors.border }]}
                >
                  <Text style={[setup.genderText, { color: gender === g ? "#0B0B0C" : colors.mutedForeground }]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ),
    },
    {
      title: "What's your\nstyle universe?",
      subtitle: "Select all that resonate",
      content: (
        <View style={setup.formSection}>
          <MultiFilterChips options={STYLE_CATEGORIES} selected={styles_} onToggle={toggleStyle} />
        </View>
      ),
    },
    {
      title: "What's your\nsize?",
      subtitle: "For perfectly fitted recommendations",
      content: (
        <View style={setup.formSection}>
          <View style={setup.sizeGrid}>
            {SIZES.map((s) => (
              <Pressable
                key={s}
                onPress={() => { Haptics.selectionAsync(); setSize(s); }}
                style={[
                  setup.sizeBtn,
                  {
                    backgroundColor: size === s ? colors.gold : "transparent",
                    borderColor: size === s ? colors.gold : colors.border,
                  },
                ]}
              >
                <Text style={[setup.sizeBtnText, { color: size === s ? "#0B0B0C" : colors.mutedForeground }]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ),
    },
    {
      title: "Your fashion\nbudget.",
      subtitle: "For outfit recommendations",
      content: (
        <View style={setup.formSection}>
          {BUDGETS.map((b) => (
            <Pressable
              key={b}
              onPress={() => { Haptics.selectionAsync(); setBudget(b); }}
              style={[setup.budgetRow, { borderColor: budget === b ? colors.gold : colors.border, backgroundColor: budget === b ? "rgba(198,167,94,0.08)" : "transparent" }]}
            >
              <View style={[setup.radioOuter, { borderColor: budget === b ? colors.gold : colors.border }]}>
                {budget === b && <View style={[setup.radioInner, { backgroundColor: colors.gold }]} />}
              </View>
              <Text style={[setup.budgetText, { color: colors.foreground }]}>{b}</Text>
            </Pressable>
          ))}
        </View>
      ),
    },
  ];

  const current = setupSteps[step - 1];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View style={styles.progressRow}>
          {Array.from({ length: STEPS - 1 }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressBar, { backgroundColor: i < step ? colors.gold : colors.border, flex: 1 }]}
            />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.gold }]}>MAISON SIMON</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{current.title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{current.subtitle}</Text>
        </View>

        {current.content}

        <View style={styles.footer}>
          <GoldButton label={step === STEPS - 1 ? "Enter the Studio" : "Continue"} onPress={next} />
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const splash = StyleSheet.create({
  container: { flex: 1 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  brandSection: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoImg: { width: 280, height: 153 },
  footer: { gap: 16 },
  guestBtn: { alignItems: "center", paddingVertical: 8 },
  guestText: { fontSize: 13, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
});

const setup = StyleSheet.create({
  formSection: { gap: 24 },
  field: { gap: 12 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  input: { borderWidth: 0.5, borderRadius: 4, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: { flex: 1, borderWidth: 0.5, borderRadius: 4, paddingVertical: 14, alignItems: "center" },
  genderText: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sizeBtn: { width: "30%", borderWidth: 0.5, borderRadius: 4, paddingVertical: 18, alignItems: "center" },
  sizeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 0.5, borderRadius: 4 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  budgetText: { fontSize: 14, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, gap: 32 },
  progressRow: { flexDirection: "row", gap: 6, height: 3, borderRadius: 2, overflow: "hidden" },
  progressBar: { height: 3, borderRadius: 2 },
  header: { gap: 12 },
  logo: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  title: { fontSize: 36, fontFamily: "PlayfairDisplay_700Bold", lineHeight: 44, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  footer: { gap: 16 },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 13, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
});
