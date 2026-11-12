import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  // The API key is read at request time on the server (src/lib/server); nothing
  // here exposes it to the browser. Never add it to `env` or give it a
  // NEXT_PUBLIC_ prefix: both would inline it in the JS bundle.
  poweredByHeader: false,
  // Served at www.microburbs.com.au/demos: the main site rewrites /demos/* here.
  basePath: BASE_PATH,
  async redirects() {
    return [
      // The bare deployment (the vercel.app URL) used to serve the demo at its
      // root; send the root and every old path to the same page under /demos.
      { source: "/", destination: BASE_PATH, basePath: false, permanent: false },
      {
        source: "/:path((?!demos(?:/|$)).+)",
        destination: `${BASE_PATH}/:path`,
        basePath: false,
        permanent: false,
      },
      // Old routes: the city map became the heat maps; suburb search became the homepage search.
      { source: "/city", destination: "/heatmaps", permanent: false },
      {
        source: "/search",
        has: [{ type: "query", key: "suburb", value: "(?<suburb>.+)" }],
        destination: "/suburbs/:suburb",
        permanent: false,
      },
      { source: "/search", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
