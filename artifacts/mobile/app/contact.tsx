import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function ContactScreen() {
  return (
    <EditorialPage
      eyebrow="THE HOUSE"
      title={"Contact\nUs"}
      introIcon="mail"
      intro="Whether you have a question about a look, a partnership enquiry, or simply want to talk style — the house is listening. We answer every message personally, usually within two business days."
      sections={[
        {
          title: "General Enquiries",
          icon: "mail",
          body: "For anything and everything:\n\nhello@simonyarrell.com\n\nWe read every message and aim to reply within 48 hours, Monday to Friday.",
        },
        {
          title: "Styling & Membership",
          icon: "star",
          body: "Questions about your membership, Signature Looks, or personal styling recommendations:\n\nstyling@simonyarrell.com",
        },
        {
          title: "Press & Partnerships",
          icon: "briefcase",
          body: "Media requests, brand partnerships, and affiliate enquiries:\n\npress@simonyarrell.com\n\nOur press kit and affiliate disclosure are available on the Press page.",
        },
        {
          title: "Privacy & Legal",
          icon: "shield",
          body: "For data or privacy matters, contact privacy@simonyarrell.com — see our Privacy Policy for how your information is handled.",
        },
        {
          title: "Our Home",
          icon: "map-pin",
          body: "Simon Yarrell Fashion, Inc.\nNew York, NY\n\nBy appointment only.",
        },
      ]}
    />
  );
}
