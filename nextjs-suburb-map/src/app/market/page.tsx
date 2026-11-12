import type { Metadata } from "next";
import { MarketDashboard } from "./MarketDashboard";

export const metadata: Metadata = { title: "Market dashboard", alternates: { canonical: "/market" } };

export default function Page() {
  return <MarketDashboard />;
}
