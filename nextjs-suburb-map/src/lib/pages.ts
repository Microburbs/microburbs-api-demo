/** Every demo in the app. Drives the nav, the homepage cards and each page's header. */
export type DemoPage = {
  slug: string;
  name: string;
  /** Short label for the top nav. */
  nav: string;
  /** What someone would build this as. */
  pitch: string;
  /** Endpoint templates the page calls, as the API reference names them. */
  endpoints: string[];
  /** "main" pages sit in the top nav; "more" ones under the More menu. */
  group: "main" | "more";
  isNew?: boolean;
  /** The page's main source file, relative to src/app (see sourceUrl). */
  source: string;
};

export const DEMOS: DemoPage[] = [
  {
    slug: "suburbs",
    source: "suburbs/page.tsx",
    nav: "Suburb reports",
    name: "Suburb reports",
    group: "main",
    isNew: true,
    pitch:
      "A one-page report for each of the nine sample suburbs, one per state and territory: market, prices and rents over time, demographics, crime, schools, lifestyle, risks and development.",
    endpoints: [
      "/suburbs/{name}/hero/summary",
      "/suburbs/{name}/market/all",
      "/suburbs/{name}/demographics/all",
      "/suburbs/{name}/ethnicity/all",
      "/suburbs/{name}/crime/summary",
      "/suburbs/{name}/schools/all",
      "/suburbs/{name}/lifestyle/livability",
      "/suburbs/{name}/risks/all",
      "/suburbs/{name}/development/all",
      "/suburbs/{name}/shapes/boundary",
    ],
  },
  {
    slug: "listings",
    source: "listings/page.tsx",
    nav: "Listings",
    name: "Listings",
    group: "main",
    isNew: true,
    pitch: "Homes for sale, for rent and recently sold in the sample suburbs, with filters, a map view and a page for every listing.",
    endpoints: [
      "/suburbs/{name}/listings/for-sale",
      "/suburbs/{name}/listings/for-rent",
      "/suburbs/{name}/sales/recent",
    ],
  },
  {
    slug: "crime",
    source: "crime/CrimeDashboard.tsx",
    group: "main",
    nav: "Crime",
    name: "Crime and safety",
    pitch:
      "How a suburb compares with the national rate, which offences drive it, and which blocks of the suburb carry it.",
    endpoints: [
      "/suburbs/{name}/crime/summary",
      "/suburbs/{name}/crime/breakdown",
      "/suburbs/{name}/crime/by-mesh-block",
      "/suburbs/{name}/lifestyle/livability",
      "/suburbs/{name}/shapes/mesh-blocks",
      "/suburbs/{name}/shapes/boundary",
    ],
  },
  {
    slug: "map",
    source: "map/MicroburbMap.tsx",
    group: "main",
    nav: "Block map",
    name: "Microburb map",
    pitch: "Price, rent, yield, income, livability and crime for every block of one suburb, on a map you can switch between.",
    endpoints: [
      "/suburbs/{name}/shapes/mesh-blocks",
      "/suburbs/{name}/market/median-price-map",
      "/suburbs/{name}/market/rent-map",
      "/suburbs/{name}/market/yield-map",
      "/suburbs/{name}/demographics/income-map",
      "/suburbs/{name}/lifestyle/livability-map",
      "/suburbs/{name}/crime/by-mesh-block",
      "/suburbs/{name}/shapes/boundary",
    ],
  },
  {
    slug: "market",
    source: "market/MarketDashboard.tsx",
    group: "more",
    nav: "Market",
    name: "Market dashboard",
    pitch: "The full history of prices, rents, yields and vacancy for houses and units, with growth and the forecast range.",
    endpoints: [
      "/suburbs/{name}/market/median-sale-price-series",
      "/suburbs/{name}/market/median-rent-series",
      "/suburbs/{name}/market/yield-pct-series",
      "/suburbs/{name}/market/vacancy-rate-series",
      "/suburbs/{name}/market/price-growth",
      "/suburbs/{name}/forecast/sale",
      "/suburbs/{name}/market/days-on-market",
      "/suburbs/{name}/sales/recent",
    ],
  },
  {
    slug: "property",
    source: "property/PropertyProfile.tsx",
    group: "main",
    nav: "Property",
    name: "Property profile",
    pitch:
      "Any of the sample addresses: valuation and range, value over time, its street, sale history, hazards, schools, transport and nearby sales.",
    endpoints: [
      "/properties/{gnaf_id}/basics/all",
      "/properties/{gnaf_id}/valuation/avm",
      "/properties/{gnaf_id}/valuation/value-series",
      "/properties/{gnaf_id}/history/all",
      "/properties/{gnaf_id}/street/profile",
      "/properties/{gnaf_id}/risks/all",
      "/properties/{gnaf_id}/schools/ranking",
      "/properties/{gnaf_id}/transport/nearby",
      "/properties/{gnaf_id}/comparables/recent-sales-nearby",
      "/properties/{gnaf_id}/profile",
    ],
  },
  {
    slug: "compare",
    source: "compare/SuburbCompare.tsx",
    group: "more",
    nav: "Compare",
    name: "Suburb comparison",
    pitch: "The nine sample suburbs side by side: prices, rents, yields, growth, days on market and crime. Sort by any column.",
    endpoints: ["/suburbs/{name}/market/all", "/suburbs/{name}/crime/summary"],
  },
];

export const demoBySlug = (slug: string) => DEMOS.find((d) => d.slug === slug)!;

export const MAIN_NAV = DEMOS.filter((d) => d.group === "main");
export const MORE_NAV = DEMOS.filter((d) => d.group === "more");

/** This demo's source code (public). */
export const REPO_URL = "https://github.com/Microburbs/microburbs-api-demo";

/**
 * GitHub link to one of this app's source files. `file` is relative to src/app,
 * e.g. "crime/CrimeDashboard.tsx". The only place the repo path is spelled out.
 */
export const sourceUrl = (file: string) => `${REPO_URL}/blob/main/nextjs-suburb-map/src/app/${file}`;

/** Other demos built on the same API, from other stacks. */
export const MORE_DEMOS = [
  {
    name: "Python quickstart",
    pitch: "Your first calls from Python on the sandbox key: a suburb, a property, all nine sample suburbs in one table and a chart.",
    href: `${REPO_URL}/tree/main/python-quickstart`,
    cta: "View on GitHub",
  },
];
