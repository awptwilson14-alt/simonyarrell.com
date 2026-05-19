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
import { MultiFilterChips } from "@/components/FilterChips";
import { BUDGETS, GENDERS, STYLE_CATEGORIES } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { height } = Dimensions.get("window");
const STEPS = 4;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Women");
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
      completeOnboarding({ name: name || "Guest", gender, budget, favoriteStyles: styles_ });
      router.replace("/(tabs)");
    }
  };

  const skip = () => {
    completeOnboarding({ name: "Guest", gender, budget, favoriteStyles: styles_ });
    router.replace("/(tabs)");
  };

  const steps = [
    {
      title: "Luxury Styling,\nPowered by AI.",
      subtitle: "Your personal stylist, available anytime.",
      content: (
        <View style={stepStyles.welcome}>
          <Image
            source={require("../assets/images/hero_banner.png")}
            style={stepStyles.heroImage}
            resizeMode="cover"
          />
          <View style={[stepStyles.heroOverlay, { backgroundColor: "rgba(8,8,8,0.6)" }]} />
        </View>
      ),
    },
    {
      title: "How do you\nlike to dress?",
      subtitle: "We'll personalize your experience",
      content: (
        <View style={stepStyles.formSection}>
          <View style={stepStyles.field}>
            <Text style={[stepStyles.fieldLabel, { color: colors.mutedForeground }]}>
              YOUR NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                stepStyles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.input,
                },
              ]}
            />
          </View>
          <View style={stepStyles.field}>
            <Text style={[stepStyles.fieldLabel, { color: colors.mutedForeground }]}>
              STYLE PROFILE
            </Text>
            <View style={stepStyles.genderRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGender(g);
                  }}
                  style={[
                    stepStyles.genderBtn,
                    {
                      backgroundColor: gender === g ? colors.gold : "transparent",
                      borderColor: gender === g ? colors.gold : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      stepStyles.genderText,
                      { color: gender === g ? "#080808" : colors.mutedForeground },
                    ]}
                  >
                    {g}
                  </Text>
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
        <View style={stepStyles.formSection}>
          <MultiFilterChips
            options={STYLE_CATEGORIES}
            selected={styles_}
            onToggle={toggleStyle}
          />
        </View>
      ),
    },
    {
      title: "Your fashion\nbudget.",
      subtitle: "For outfit recommendations",
      content: (
        <View style={stepStyles.formSection}>
          {BUDGETS.map((b) => (
            <Pressable
              key={b}
              onPress={() => {
                Haptics.selectionAsync();
                setBudget(b);
              }}
              style={[
                stepStyles.budgetRow,
                {
                  borderColor: budget === b ? colors.gold : colors.border,
                  backgroundColor: budget === b ? "rgba(201,168,76,0.08)" : "transparent",
                },
              ]}
            >
              <View
                style={[
                  stepStyles.radioOuter,
                  { borderColor: budget === b ? colors.gold : colors.border },
                ]}
              >
                {budget === b && (
                  <View style={[stepStyles.radioInner, { backgroundColor: colors.gold }]} />
                )}
              </View>
              <Text style={[stepStyles.budgetText, { color: colors.foreground }]}>{b}</Text>
            </Pressable>
          ))}
        </View>
      ),
    },
  ];

  const current = steps[step];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 0 && (
        <Image
          source={require("../assets/images/hero_banner.png")}
          style={styles.bgImage}
          resizeMode="cover"
        />
      )}
      {step === 0 && (
        <LinearGradient
          colors={["transparent", "rgba(8,8,8,0.7)", "#080808"]}
          style={styles.bgGradient}
        />
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {step > 0 && (
          <View style={styles.progressRow}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: i <= step ? colors.gold : colors.border,
                    width: i === step ? 24 : 6,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.gold }]}>MAISON SIMON</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {current.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {current.subtitle}
          </Text>
        </View>

        {current.content}

        <View style={styles.footer}>
          <GoldButton
            label={step === STEPS - 1 ? "Enter the Studio" : "Continue"}
            onPress={next}
          />
          {step > 0 && (
            <Pressable onPress={skip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                Skip for now
              </Text>
            </Pressable>
          )}
          {step === 0 && (
            <Pressable onPress={skip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                Continue as guest
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    paddingHorizontal: 28,
    gap: 32,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  header: {
    gap: 12,
  },
  logo: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  title: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  footer: {
    gap: 16,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});

const stepStyles = StyleSheet.create({
  welcome: {
    height: 200,
    borderRadius: 2,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  formSection: {
    gap: 24,
  },
  field: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  input: {
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: "center",
  },
  genderText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 0.5,
    borderRadius: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  budgetText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
});
