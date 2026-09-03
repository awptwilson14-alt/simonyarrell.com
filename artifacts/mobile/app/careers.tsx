import React from "react";
import { EditorialPage } from "@/components/EditorialPage";

export default function CareersScreen() {
  return (
    <EditorialPage
      eyebrow="THE HOUSE"
      title={"Careers"}
      introIcon="award"
      intro="Simon Yarrell sits at the intersection of high fashion and intelligent technology. We are a small, exacting team — and we hire slowly, deliberately, and for taste as much as talent."
      sections={[
        {
          title: "How We Work",
          icon: "users",
          body: "We are a remote-first house headquartered in New York. Small teams, high trust, no bureaucracy. Every person here shapes the product — from the cut of a headline to the logic of a recommendation.",
        },
        {
          title: "Who We Look For",
          icon: "eye",
          body: "Engineers who care about craft. Stylists who understand systems. Writers who know that restraint is a form of luxury. If you have an obsessive eye for detail and a genuine love of fashion, we want to hear from you.",
        },
        {
          title: "Open Roles",
          icon: "briefcase",
          body: "We are not actively hiring at this moment, but exceptional people are the exception to every rule.\n\nSend a short note and whatever best represents your work to:\n\ncareers@simonyarrell.com",
        },
        {
          title: "Our Commitment",
          icon: "heart",
          body: "Simon Yarrell is an equal-opportunity employer. Style has no single background, and neither does our team. All qualified applicants are considered without regard to race, religion, gender identity, sexual orientation, age, or disability.",
        },
      ]}
    />
  );
}
