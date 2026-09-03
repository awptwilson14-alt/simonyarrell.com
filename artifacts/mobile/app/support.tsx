import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function SupportScreen() {
  return (
    <EditorialPage
      eyebrow="THE HOUSE"
      title={"Support"}
      introIcon="life-buoy"
      intro="Something not working the way it should? Most questions are answered in the FAQ — for everything else, our team responds personally within two business days."
      sections={[
        {
          title: "App Issues",
          icon: "smartphone",
          body: "If the app misbehaves, first try closing and reopening it — most glitches resolve instantly. Still stuck? Email us with your device model and a short description:\n\nsupport@simonyarrell.com",
        },
        {
          title: "Membership & Billing",
          icon: "credit-card",
          body: "Subscriptions are billed and managed through your device's app store. To change or cancel a plan, open your App Store or Google Play subscription settings. For anything unusual on your bill, contact support and we'll help you sort it out.",
        },
        {
          title: "Orders & Returns",
          icon: "shopping-bag",
          body: "Purchases are made directly with the retailer (e.g. Gucci, Loro Piana, The Row), so shipping, returns, and exchanges are handled by them under their policies. Your order confirmation email will contain the retailer's support details.",
        },
        {
          title: "Promo Codes",
          icon: "tag",
          body: "Promo codes are redeemed on the Membership page. Codes are case-insensitive and single-use per account. If a valid code isn't applying, email support with the code name (never share it publicly).",
        },
        {
          title: "Reach Us",
          icon: "mail",
          body: "support@simonyarrell.com\n\nMonday – Friday, 9am – 6pm ET\nWe aim to reply within 48 hours.",
        },
      ]}
    />
  );
}
