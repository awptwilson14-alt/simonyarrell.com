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

import { BrandWordmark } from "@/components/BrandWordmark";
import { GoldButton } from "@/components/GoldButton";
import { TitleRule } from "@/components/TitleRule";
import { MultiFilterChips } from "@/components/FilterChips";
import { BUDGETS, GENDERS, SEASONS, STYLE_CATEGORIES } from "@/constants/data";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// NOTE: HeroAudio was previously mounted here in batch 75 to play a Kenny G
// welcome cue. It triggered a native-binary signature mismatch in expo-audio
// on iOS ("Received 4 arguments, but 3 was expected") that crashed the splash
// before the user could tap GET STARTED. Reverted in batch 77; HeroAudio
// remains on the home tab (and is now wrapped in an error boundary there).

const { width, height } = Dimensions.get("window");
// 6 steps: 0 splash + 5 setup (profile, style universe, season, size, budget).
// Season was inserted after style universe (batch 132) so the engine can
// apply a season filter from the moment the user lands on the home tab.
const STEPS = 6;
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
  const [season, setSeason] = useState("All Season");

  const toggleStyle = (s: string) => {
    setStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS - 1) setStep(step + 1);
    else {
      completeOnboarding({ name: name || "Guest", gender, size, budget, favoriteStyles: styles_, season });
      router.replace("/(tabs)");
    }
  };

  const skip = () => {
    completeOnboarding({ name: "Guest", gender, size, budget, favoriteStyles: styles_, season });
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
        {/* Editorial framing gradient — solid dark at the very top so the
            brand lockup reads on near-black, clears in the middle band so
            the hero models are fully visible, then deepens to solid #0B0B0C
            at the bottom so the gold CTA sits on a clean dark plate. */}
        <LinearGradient
          colors={[
            "rgba(11,11,12,0.96)",
            "rgba(11,11,12,0.78)",
            "rgba(11,11,12,0.10)",
            "rgba(11,11,12,0.55)",
            "#0B0B0C",
          ]}
          locations={[0, 0.22, 0.45, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[splash.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 36 }]}>
          {/* Brand lockup — pinned to the TOP of the screen (not centered)
              so the editorial hero photo of the models fills the middle band
              of the composition, matching the reference splash layout. */}
          <View style={splash.brandSection}>
            <BrandWordmark variant="stacked" height={108} />
          </View>

          {/* Spacer pushes the CTA to the bottom while leaving the middle
              of the screen open for the hero photo to read through. */}
          <View style={splash.spacer} />

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

  // ── Steps 1–4 — Profile setup (gender, styles, size, budget) ──────
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
      // Season step (batch 132) — drives the engine's season filter so every
      // generated look uses fabrics + silhouettes that read for the chosen
      // season. "All Season" disables the filter for users who don't want
      // weather constraints (e.g. travel, capsule planning).
      title: "Which season\nare you dressing for?",
      subtitle: "Every look will match the season you pick",
      content: (
        <View style={setup.formSection}>
          <View style={setup.seasonGrid}>
            {SEASONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => { Haptics.selectionAsync(); setSeason(s); }}
                style={[
                  setup.seasonBtn,
                  {
                    backgroundColor: season === s ? colors.gold : "transparent",
                    borderColor: season === s ? colors.gold : colors.border,
                  },
                ]}
              >
                <Text style={[setup.seasonText, { color: season === s ? "#0B0B0C" : colors.mutedForeground }]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
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

  // Gendered editorial backdrop for setup steps. Mirrors the SPLASH_HEROES
  // map used on the welcome screen, but heavily dimmed so the chips, inputs,
  // and progress bar stay perfectly legible. Updates live as the user
  // toggles between Women/Men/Unisex in step 1, so the rest of onboarding
  // (style universe / size / budget) is visually personalized from the
  // moment they pick. "Unisex" picks the women variant by convention since
  // the men hero is suit-locked and reads less neutral.
  const heroKey: "men" | "women" = gender === "Men" ? "men" : "women";
  const setupBackdrop = SPLASH_HEROES[heroKey];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={setupBackdrop}
        style={styles.backdrop}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(11,11,12,0.55)", "rgba(11,11,12,0.85)", "#0B0B0C"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
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
          <Text style={[styles.logo, { color: colors.gold }]}>SIMON YARRELL</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{current.title}</Text>
          {/* Gold rule (batch 125) — completes the editorial-hero motif
              coverage. Onboarding was the first-impression hero the rest of
              the app's gold-rule treatment (batches 115-124) was modeled
              after, but it never got the rule itself. width:36 matches the
              36px Playfair (1:1 ratio fitting the 'eyebrow + title + sub'
              hero composition used by activity/membership/privacy/partners).
              marginTop:-6 pulls the rule into a tight ~6px pairing with
              the title while leaving the full gap:12 to the subtitle. */}
          <TitleRule width={36} style={{ marginTop: -6 }} />
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
  content: { flex: 1, paddingHorizontal: 28 },
  // Brand pinned to top (no flex:1, no vertical centering) so the editorial
  // hero photo of the models is visible through the middle of the splash.
  brandSection: { alignItems: "center" },
  spacer: { flex: 1 },
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
  seasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  seasonBtn: { width: "47%", borderWidth: 0.5, borderRadius: 4, paddingVertical: 18, alignItems: "center" },
  seasonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 0.5, borderRadius: 4 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  budgetText: { fontSize: 14, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.45 },
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
