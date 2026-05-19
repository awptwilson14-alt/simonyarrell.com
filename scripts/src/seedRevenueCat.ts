import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Maison Simon";

const APP_STORE_APP_NAME = "Maison Simon iOS";
const APP_STORE_BUNDLE_ID = "app.maisonsimonfashion.ios";
const PLAY_STORE_APP_NAME = "Maison Simon Android";
const PLAY_STORE_PACKAGE_NAME = "app.maisonsimonfashion.android";

const ENTITLEMENT_IDENTIFIER = "premium";
const ENTITLEMENT_DISPLAY_NAME = "Premium Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

// Monthly plan
const MONTHLY_PRODUCT_IDENTIFIER = "maison_simon_monthly";
const MONTHLY_PLAY_STORE_IDENTIFIER = "maison_simon_monthly:monthly";
const MONTHLY_DISPLAY_NAME = "Maison Simon Monthly";
const MONTHLY_DURATION = "P1M";
const MONTHLY_PACKAGE_IDENTIFIER = "$rc_monthly";
const MONTHLY_PACKAGE_DISPLAY_NAME = "Monthly Membership";
const MONTHLY_PRICES = [
  { amount_micros: 2990000, currency: "USD" }, // $2.99
];

// Annual plan
const ANNUAL_PRODUCT_IDENTIFIER = "maison_simon_annual";
const ANNUAL_PLAY_STORE_IDENTIFIER = "maison_simon_annual:annual";
const ANNUAL_DISPLAY_NAME = "Maison Simon Annual";
const ANNUAL_DURATION = "P1Y";
const ANNUAL_PACKAGE_IDENTIFIER = "$rc_annual";
const ANNUAL_PACKAGE_DISPLAY_NAME = "Annual Membership";
const ANNUAL_PRICES = [
  { amount_micros: 25000000, currency: "USD" }, // $25.00
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products helper ───────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    identifier: string,
    isTestStore: boolean,
    duration: string,
    displayName: string
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === identifier && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: identifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = displayName;
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const addTestStorePrices = async (productId: string, prices: typeof MONTHLY_PRICES, label: string) => {
    const { data, error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: productId },
      body: { prices },
    });
    if (error) {
      if (typeof error === "object" && "type" in error && error["type"] === "resource_already_exists") {
        console.log(`${label} test store prices already exist`);
      } else {
        throw new Error(`Failed to add ${label} test store prices`);
      }
    } else {
      console.log(`Added ${label} test store prices:`, JSON.stringify(data.prices));
    }
  };

  // Monthly products
  const monthlyTest = await ensureProduct(testStoreApp, "Monthly (Test)", MONTHLY_PRODUCT_IDENTIFIER, true, MONTHLY_DURATION, MONTHLY_DISPLAY_NAME);
  const monthlyAppStore = await ensureProduct(appStoreApp, "Monthly (App Store)", MONTHLY_PRODUCT_IDENTIFIER, false, MONTHLY_DURATION, MONTHLY_DISPLAY_NAME);
  const monthlyPlayStore = await ensureProduct(playStoreApp, "Monthly (Play Store)", MONTHLY_PLAY_STORE_IDENTIFIER, false, MONTHLY_DURATION, MONTHLY_DISPLAY_NAME);
  await addTestStorePrices(monthlyTest.id, MONTHLY_PRICES, "Monthly");

  // Annual products
  const annualTest = await ensureProduct(testStoreApp, "Annual (Test)", ANNUAL_PRODUCT_IDENTIFIER, true, ANNUAL_DURATION, ANNUAL_DISPLAY_NAME);
  const annualAppStore = await ensureProduct(appStoreApp, "Annual (App Store)", ANNUAL_PRODUCT_IDENTIFIER, false, ANNUAL_DURATION, ANNUAL_DISPLAY_NAME);
  const annualPlayStore = await ensureProduct(playStoreApp, "Annual (Play Store)", ANNUAL_PLAY_STORE_IDENTIFIER, false, ANNUAL_DURATION, ANNUAL_DISPLAY_NAME);
  await addTestStorePrices(annualTest.id, ANNUAL_PRICES, "Annual");

  // ── Entitlement ───────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEnt.id);
    entitlement = newEnt;
  }

  const { error: attachEntError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: {
      product_ids: [
        monthlyTest.id, monthlyAppStore.id, monthlyPlayStore.id,
        annualTest.id, annualAppStore.id, annualPlayStore.id,
      ],
    },
  });
  if (attachEntError && attachEntError.type !== "unprocessable_entity_error") {
    throw new Error("Failed to attach products to entitlement");
  }
  console.log("Products attached to entitlement");

  // ── Offering ─────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages ──────────────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  const ensurePackage = async (pkgIdentifier: string, pkgDisplayName: string): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === pkgIdentifier);
    if (existing) {
      console.log(`Package ${pkgIdentifier} already exists:`, existing.id);
      return existing;
    }
    const { data: newPkg, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: pkgIdentifier, display_name: pkgDisplayName },
    });
    if (error) throw new Error(`Failed to create package ${pkgIdentifier}`);
    console.log(`Created package ${pkgIdentifier}:`, newPkg.id);
    return newPkg;
  };

  const monthlyPkg = await ensurePackage(MONTHLY_PACKAGE_IDENTIFIER, MONTHLY_PACKAGE_DISPLAY_NAME);
  const annualPkg = await ensurePackage(ANNUAL_PACKAGE_IDENTIFIER, ANNUAL_PACKAGE_DISPLAY_NAME);

  const attachPkg = async (pkg: Package, testProduct: Product, appStoreProduct: Product, playStoreProduct: Product, label: string) => {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProduct.id, eligibility_criteria: "all" },
          { product_id: appStoreProduct.id, eligibility_criteria: "all" },
          { product_id: playStoreProduct.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (error && !(error.type === "unprocessable_entity_error" && error.message?.includes("Cannot attach product"))) {
      throw new Error(`Failed to attach products to ${label} package`);
    }
    console.log(`${label} package products attached`);
  };

  await attachPkg(monthlyPkg, monthlyTest, monthlyAppStore, monthlyPlayStore, "Monthly");
  await attachPkg(annualPkg, annualTest, annualAppStore, annualPlayStore, "Annual");

  // ── API Keys ──────────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testStoreApp.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("Maison Simon RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement:", ENTITLEMENT_IDENTIFIER);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY:", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:", iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:", androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("REVENUECAT_PROJECT_ID:", project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID:", testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID:", appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID:", playStoreApp.id);
  console.log("====================\n");
}

seedRevenueCat().catch(console.error);
