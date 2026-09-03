import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function CookiePolicyScreen() {
  return (
    <EditorialPage
      eyebrow="LEGAL"
      title={"Cookie\nPolicy"}
      subtitle="Effective date: May 19, 2026"
      introIcon="info"
      intro="This policy explains how Simon Yarrell uses cookies and similar on-device technologies. The short version: we use almost none, and never for advertising."
      sections={[
        {
          title: "What Cookies Are",
          icon: "disc",
          body: "Cookies are small files stored on your device that help apps and websites remember who you are and what you prefer. On mobile, similar purposes are served by local device storage.",
        },
        {
          title: "What We Use",
          icon: "database",
          body: "Essential storage only. Your style preferences, saved looks, and session state are kept in local storage on your device so the app works and remembers your choices. These are strictly necessary and cannot be disabled without breaking core features.",
        },
        {
          title: "What We Don't Use",
          icon: "x-circle",
          body: "We do not use advertising cookies, cross-site tracking, or third-party analytics cookies. We do not build advertising profiles, and we do not sell data derived from cookies or local storage — ever.",
        },
        {
          title: "Third-Party Retailers",
          icon: "link",
          body: "When you follow a purchase link to a retailer such as Gucci or The Row, that retailer may set its own cookies under its own policy. Affiliate links may include a referral tag so retailers can attribute purchases, at no cost to you.",
        },
        {
          title: "Your Choices",
          icon: "sliders",
          body: "You can clear all locally stored data at any time by uninstalling the app or clearing its storage in your device settings. On the web, your browser settings let you block or delete cookies.",
        },
        {
          title: "Questions",
          icon: "mail",
          body: "For anything cookie- or privacy-related:\n\nprivacy@simonyarrell.com",
        },
      ]}
    />
  );
}
