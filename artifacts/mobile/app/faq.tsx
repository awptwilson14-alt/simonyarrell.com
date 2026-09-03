import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function FAQScreen() {
  return (
    <EditorialPage
      eyebrow="THE HOUSE"
      title={"Frequently\nAsked"}
      introIcon="help-circle"
      intro="The questions we hear most, answered plainly. If yours isn't here, Support will take care of you."
      sections={[
        {
          title: "What is Simon Yarrell?",
          icon: "star",
          body: "A luxury styling platform. We curate complete, season-coherent looks from the world's finest houses — tailored to your taste and budget — and link you directly to the retailers that sell each piece.",
        },
        {
          title: "Do you sell the clothes?",
          icon: "shopping-bag",
          body: "No. Every piece is purchased directly from the retailer or brand. We may earn a small commission on purchases made through our links, at no extra cost to you — and commissions never influence what we recommend.",
        },
        {
          title: "How are looks put together?",
          icon: "layers",
          body: "Each look is assembled by our styling engine under strict house rules: every look is complete, seasonally consistent, within your selected budget in total, and never repeated. Think of it as a personal stylist with perfect memory.",
        },
        {
          title: "What does the budget setting mean?",
          icon: "dollar-sign",
          body: "Your budget is a hard cap on the total price of a look — every piece combined, not per item. If you select $1,500, no look shown will exceed $1,500 in total.",
        },
        {
          title: "How does Virtual Try-On work?",
          icon: "camera",
          body: "Try-On overlays looks on your live camera feed, processed entirely on your device. Nothing is recorded, stored, or transmitted — the feed never leaves your phone.",
        },
        {
          title: "What do memberships include?",
          icon: "award",
          body: "Membership unlocks premium styling features such as expanded look generation and exclusive edits. Plans renew automatically and can be cancelled anytime from your device's app store settings. See the Membership page for current tiers.",
        },
        {
          title: "Is my data private?",
          icon: "shield",
          body: "Yes. Preferences and saved looks live on your device by default. We collect no names, emails, phone numbers, or payment details, and we never sell personal data. Full details are in our Privacy Policy.",
        },
        {
          title: "Something else?",
          icon: "mail",
          body: "Write to us anytime:\n\nhello@simonyarrell.com\n\nWe reply within two business days.",
        },
      ]}
    />
  );
}
