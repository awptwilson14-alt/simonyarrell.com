---
name: Central affiliate resolver policy
description: Non-negotiable monetization rules for all buy links (Rakuten spec); resolver priority, preservation, country safety
---

# Central affiliate resolver — durable policy

**Rule:** All buy links monetize through ONE resolver (server is the source of truth; the client keeps a synchronous mirror only because web popup blockers forbid an await before window.open). No screen may implement network-specific logic.

**Why:** Owner-supplied Rakuten spec (Aug 2026): fabricating tracking links, monetizing non-active partnerships, or letting commission touch styling would breach network terms and styling credibility.

**How to apply:**
- Priority: direct retailer program → Rakuten → Awin → Impact → CJ → Skimlinks → original URL; owner-configurable per-partnership priority overrides ties. Failure of anything ⇒ original URL; shopping must never break.
- Only "active" partnerships within their date window with deep-linking enabled may monetize. Deep-link templates ({url} placeholder) are pasted by the owner from the network's own tools — never construct/guess tracking URLs, advertiser IDs, MIDs, or params.
- Already-monetized URLs are IMMUTABLE — both redirector hosts (linksynergy, skimresources, awin1, pxf.io, shopltk…) AND attribution params (u1/awc/irclickid/sid/subid/afftrack). This guard must exist in BOTH server and client resolvers (architect flagged the server missing it once).
- Country-restricted partnerships: no country signal ⇒ exclude the row (fail safe), and never ship country-limited templates in the public offline feed.
- Commission rate is stored for the admin dashboard only — it must never appear in the styling/ranking engine.
- mailto: links are not retailer links; never wrap them.
- The affiliate disclosure component near shopping surfaces is a compliance requirement — keep it in redesigns.
