---
name: Verified real-product images
description: Shoppable looks require exact retailer product images; invalid products are rejected and replaced before rendering
---

# Verified real-product images

**Rule:** Every shoppable piece must be a real retailer product with its exact product image and exact product-detail URL. If its image is absent or not explicitly verified, reject the product and select another product in that category before rendering the look.

**Why:** The owner replaced the earlier generated-image requirement with the complete real-product shopping specification: no AI-generated, stock, editorial, generic, similar-product, brand-logo, monogram, or placeholder substitutes—no verified image means no product card.

**How to apply:**
- Preserve product identity as one inseparable record: ID, brand, exact name, color/variant, price, retailer, image URL, and canonical PDP URL.
- Only verified source-ingestion rows may enter outfit pools; legacy invented catalog rows, brand-homepage links, Unsplash images, local AI assets, and generated-image fallbacks are never valid.
- Image/PDP failure means replace that item and revalidate the complete look; do not render a visual substitute.
- Direct retailer links are valid and preferred when no legitimate affiliate link is available.
