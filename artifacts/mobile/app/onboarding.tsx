import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/lib/safeWebShims";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
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
import { OrnamentRule } from "@/components/OrnamentRule";
import { TitleRule } from "@/components/TitleRule";
import { MultiFilterChips } from "@/components/FilterChips";
import { BUDGETS, GENDERS, SEASONS, STYLE_CATEGORIES } from "@/constants/data";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";

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
  // Desktop web (≥1024px) gets an editorial two-column splash. Mobile +
  // tablet keep the original full-bleed phone layout untouched.
  const { isDesktop, isTablet } = useResponsive();
  const isDesktopWeb = isDesktop && Platform.OS === "web";

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
    // Desktop web variant — editorial two-column layout with the hero on
    // the right, brand + CTA on the left, content capped at 1280px and
    // centered. CTA button is fixed-width (not full-bleed) for the
    // luxury-site feel requested.
    if (isDesktopWeb) {
      return (
        <View style={[splash.container, { backgroundColor: "#0B0B0C" }]}>
          <View style={splashDesktop.outer}>
            <View style={splashDesktop.shell}>
              {/* LEFT column — brand, eyebrow, CTA, guest link. */}
              <View style={splashDesktop.left}>
                <View style={splashDesktop.brandBlock}>
                  <BrandWordmark variant="stacked" height={132} />
                </View>

                <View style={splashDesktop.copyBlock}>
                  <Text style={splashDesktop.eyebrow}>
                    MAISON SIMON · SIMON YARRELL
                  </Text>
                  <Text style={splashDesktop.headline}>
                    Your private{"\n"}atelier of style.
                  </Text>
                  <Text style={splashDesktop.subhead}>
                    An AI-powered styling house composing real luxury
                    looks from real brands — tailored to your taste,
                    season, and budget.
                  </Text>
                </View>

                <View style={splashDesktop.ctaBlock}>
                  <View style={splashDesktop.ctaWrap}>
                    <GoldButton label="GET STARTED" onPress={next} />
                  </View>
                  <OrnamentRule
                    width={160}
                    diamondSize={6}
                    style={splashDesktop.ornament}
                  />
                  <Pressable
                    onPress={skip}
                    style={splashDesktop.guestBtn}
                    hitSlop={8}
                  >
                    <Text style={splash.guestText}>Continue as guest</Text>
                  </Pressable>
                </View>
              </View>

              {/* RIGHT column — controlled-crop hero image inside a
                  gold-hairline frame. */}
              <View style={splashDesktop.right}>
                <View
                  style={[
                    splashDesktop.heroFrame,
                    { borderColor: colors.gold },
                  ]}
                >
                  <Image
                    source={require("../assets/images/splash_hero.png")}
                    style={splashDesktop.heroImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      "rgba(11,11,12,0.55)",
                      "rgba(11,11,12,0.05)",
                      "rgba(11,11,12,0.55)",
                    ]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[splash.container, { backgroundColor: "#0B0B0C" }]}>
        <Image
          source={require("../assets/images/splash_hero.png")}
          style={splash.heroImage}
          resizeMode="cover"
        />
        {/* Editorial framing gradient — dark at the very top so the brand
            lockup reads on near-black, FULLY clear through the middle band so
            the hero models are actually visible (the photo is already dark;
            any veil here blacks them out — that was the invisible-models
            bug), then deepens to solid #0B0B0C only at the very bottom so
            the gold CTA sits on a clean dark plate. */}
        <LinearGradient
          colors={[
            "rgba(11,11,12,0.92)",
            "rgba(11,11,12,0.45)",
            "rgba(11,11,12,0)",
            "rgba(11,11,12,0)",
            "#0B0B0C",
          ]}
          locations={[0, 0.16, 0.32, 0.74, 1]}
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

          {/* CTA — gold plate button, then a centered ornament-rule
              ornament, then the serif-italic "Continue as guest" link.
              Mirrors the splash reference exactly. */}
          <View style={splash.footer}>
            <GoldButton label="GET STARTED" onPress={next} />
            <OrnamentRule width={140} diamondSize={6} style={splash.footerOrnament} />
            <Pressable onPress={skip} style={splash.guestBtn} hitSlop={8}>
              <Text style={splash.guestText}>Continue as guest</Text>
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

const splashDesktop = StyleSheet.create({
  // Outer fills viewport, centers the 1280px editorial shell.
  outer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingVertical: 56,
  },
  shell: {
    width: "100%",
    maxWidth: 1280,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 64,
    minHeight: 560,
  },
  left: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 24,
  },
  brandBlock: {
    alignItems: "flex-start",
  },
  copyBlock: {
    gap: 18,
    marginTop: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 4,
    color: "#C6A75E",
  },
  headline: {
    fontSize: 56,
    lineHeight: 64,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F0E1",
    letterSpacing: -0.5,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
    color: "rgba(245,240,225,0.78)",
    maxWidth: 440,
  },
  ctaBlock: {
    marginTop: 32,
    gap: 16,
    alignItems: "flex-start",
  },
  // Constrains GoldButton to elegant desktop width — phone build kept the
  // full-bleed treatment via splash.footer (alignItems:"stretch").
  ctaWrap: {
    width: 260,
  },
  ornament: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  guestBtn: {
    paddingVertical: 4,
  },
  right: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
  },
  heroFrame: {
    flex: 1,
    minHeight: 560,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#111113",
  },
  // absoluteFill (instead of width/height: "100%") so RN Web doesn't drop
  // the percentage when the heroFrame's height is resolved by flex rather
  // than a concrete value — empirically `height: "100%"` collapses inside
  // flex:1 parents on web and leaves the image invisible.
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
});

const splash = StyleSheet.create({
  container: { flex: 1 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  content: { flex: 1, paddingHorizontal: 28 },
  // Brand pinned to top (no flex:1, no vertical centering) so the editorial
  // hero photo of the models is visible through the middle of the splash.
  brandSection: { alignItems: "center" },
  spacer: { flex: 1 },
  logoImg: { width: 280, height: 153 },
  footer: { gap: 14, alignItems: "stretch" },
  footerOrnament: { alignSelf: "center", marginTop: 4 },
  guestBtn: { alignItems: "center", paddingVertical: 4 },
  guestText: {
    fontSize: 13,
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    color: "rgba(245,240,225,0.85)",
    letterSpacing: 0.3,
  },
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
