import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function TermsScreen() {
  return (
    <EditorialPage
      eyebrow="LEGAL"
      title={"Terms of\nService"}
      subtitle="Effective date: May 19, 2026"
      introIcon="file-text"
      intro="These Terms of Service govern your use of the Simon Yarrell application. By using the app, you agree to these terms. We have kept them as plain and readable as the law allows."
      sections={[
        {
          title: "Use of the Service",
          icon: "check-circle",
          body: "Simon Yarrell provides personalised style recommendations, curated looks, and links to third-party retailers. The app is for your personal, non-commercial use. You must be at least 13 years old to use the service.",
        },
        {
          title: "Purchases & Third-Party Retailers",
          icon: "shopping-bag",
          body: "Simon Yarrell does not sell products directly. When you follow a purchase link, your transaction is with the retailer, subject to their terms, pricing, and return policies. Prices and availability shown in the app are indicative and may change without notice.",
        },
        {
          title: "Affiliate Relationships",
          icon: "link",
          body: "We may earn a commission when you purchase through links in the app, at no additional cost to you. Commissions never influence which items we recommend — see our Affiliate Disclosure for full details.",
        },
        {
          title: "Membership & Subscriptions",
          icon: "star",
          body: "Paid memberships renew automatically until cancelled. You can manage or cancel your subscription at any time through your device's app store settings. Fees already paid are non-refundable except where required by law.",
        },
        {
          title: "Intellectual Property",
          icon: "feather",
          body: "The Simon Yarrell name, wordmark, editorial content, and curated looks are the property of Simon Yarrell Fashion, Inc. Product names and images belong to their respective brands. You may not reproduce or redistribute app content without written permission.",
        },
        {
          title: "Acceptable Use",
          icon: "slash",
          body: "You agree not to misuse the service — including attempting to access it by automated means, interfering with its operation, or using it for any unlawful purpose. We may suspend access for violations of these terms.",
        },
        {
          title: "Disclaimers & Liability",
          icon: "alert-triangle",
          body: 'The service is provided "as is" without warranties of any kind. Style recommendations are editorial in nature. To the fullest extent permitted by law, Simon Yarrell Fashion, Inc. is not liable for indirect or consequential damages arising from your use of the app or purchases from third-party retailers.',
        },
        {
          title: "Changes & Contact",
          icon: "edit-3",
          body: "We may update these terms from time to time; continued use after changes constitutes acceptance. Questions:\n\nlegal@simonyarrell.com\n\nSimon Yarrell Fashion, Inc.\nNew York, NY",
        },
      ]}
    />
  );
}
