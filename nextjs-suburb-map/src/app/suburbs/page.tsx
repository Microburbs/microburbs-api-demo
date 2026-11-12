import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { suburbPath } from "@/lib/api";
import { ServerCalls } from "@/lib/api-store";
import { SANDBOX_SUBURB_NAMES } from "@/lib/sandbox";
import { api } from "@/lib/server/microburbs";
import { type SuburbCard, SuburbIndex } from "./SuburbIndex";

export const metadata: Metadata = { title: "Suburb reports", alternates: { canonical: "/suburbs" } };

// Rendered on the server and cached for an hour (then refreshed in the background).
export const revalidate = 3600;

type Medians = { house: number | null; unit: number | null };
type Growth = { growth: { property_type: "house" | "unit"; pct: number | null }[] };

/**
 * The sandbox suburbs, each with its median prices and 12-month growth. Two small
 * calls per suburb, all in parallel: market/median-sale-price and
 * hero/price-growth-12mo.
 */
export default async function Page() {
  const names = SANDBOX_SUBURB_NAMES;

  const rows = await Promise.all(
    names.map(async (name) => {
      const [price, growth] = await Promise.all([
        api<Medians>(suburbPath(name, "market/median-sale-price")),
        api<Growth>(suburbPath(name, "hero/price-growth-12mo")),
      ]);
      const g = (t: "house" | "unit") => growth.data?.growth.find((x) => x.property_type === t)?.pct ?? null;
      const card: SuburbCard = {
        name,
        house: price.data?.house ?? null,
        unit: price.data?.unit ?? null,
        houseGrowth: g("house"),
        unitGrowth: g("unit"),
      };
      return { card, calls: [price.call, growth.call] };
    }),
  );

  return (
    <PageShell slug="suburbs">
      <ServerCalls calls={rows.flatMap((r) => r.calls)} />
      <SuburbIndex suburbs={rows.map((r) => r.card)} />
    </PageShell>
  );
}
