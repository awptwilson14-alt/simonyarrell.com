import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function AccessibilityScreen() {
  return (
    <EditorialPage
      eyebrow="THE HOUSE"
      title={"Accessibility"}
      introIcon="eye"
      intro="Luxury should be for everyone. Simon Yarrell is committed to making the app usable and elegant for people of all abilities, and we treat accessibility as part of the craft — not an afterthought."
      sections={[
        {
          title: "Our Standard",
          icon: "check-circle",
          body: "We design toward the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and the accessibility conventions of iOS and Android. Contrast, touch-target size, and readable type are checked as part of every release.",
        },
        {
          title: "What the App Supports",
          icon: "smartphone",
          body: "• Screen readers (VoiceOver and TalkBack) with descriptive labels on interactive elements\n• Dynamic type — layouts adapt to larger accessibility text sizes\n• High-contrast gold-on-noir palette designed for legibility\n• Generous touch targets throughout",
        },
        {
          title: "Known Limitations",
          icon: "alert-circle",
          body: "The live Virtual Try-On experience is inherently visual and may be of limited use with a screen reader. Product imagery comes from third-party retailers and may occasionally lack detailed alternative text. We are working to improve both.",
        },
        {
          title: "Tell Us",
          icon: "mail",
          body: "If you encounter a barrier anywhere in the app, we genuinely want to know — accessibility reports are triaged with the same priority as defects:\n\naccess@simonyarrell.com",
        },
      ]}
    />
  );
}
