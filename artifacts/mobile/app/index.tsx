import { Redirect } from "expo-router";
import React from "react";

import { useApp } from "@/context/AppContext";

export default function IndexScreen() {
  const { userProfile } = useApp();

  if (!userProfile.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
