import { HeroMap } from "../HeroMap";
import { get, type Json } from "../load";
import { dayMonthYear, siteMoney, trim } from "../fmt";
import { Calls, Differs, NotInApi, StatTile } from "../ui";

/**
 * The title card: name, postcode, "data as of", the outline map, Market
 * Snapshot (median price + 12-month growth, houses and units) and the four
 * Supply and Demand tiles with their capital-growth impact.
 */
export default async function HeroSection({ name }: { name: string }) {
  const [summary, price, growth12, months, dom, stock, vacancy, drivers] = await Promise.all([
    get<Json>(name, "hero/summary"),
    get<Json>(name, "market/median-sale-price"),
    get<Json>(name, "hero/price-growth-12mo"),
    get<Json>(name, "market/months-of-supply"),
    get<Json>(name, "market/days-on-market"),
    get<Json>(name, "market/stock-on-market"),
    get<Json>(name, "market/vacancy-rate"),
    get<Json>(name, "market/growth-drivers"),
  ]);
  const s = summary.data;
  const p = price.data;
  const g: Record<string, number | null> = Object.fromEntries(
    ((growth12.data?.growth ?? []) as Json[]).map((x) => [x.property_type, x.pct]),
  );
  const impact = (key: string) => {
    const d = ((drivers.data?.drivers ?? []) as Json[]).find((x) => x.key === key);
    return d?.impact_pct_per_year == null ? null : (d.impact_pct_per_year as number);
  };
  const vac = vacancy.data?.house?.value as number | undefined;
  const isBN = name === "Belmont North";

  const kpis: { label: string; value: string; cg: number | null; differs?: string }[] = [
    {
      label: "Months of Supply",
      value: months.data?.months_of_supply != null ? trim(months.data.months_of_supply, 1) : "—",
      cg: impact("prop_list_months_of_supply"),
    },
    { label: "Days on Market (Houses)", value: dom.data?.house != null ? String(Math.round(dom.data.house)) : "—", cg: null },
    {
      label: "Stock on Market",
      value: stock.data?.stock_on_market != null ? String(Math.round(stock.data.stock_on_market)) : "—",
      cg: impact("prop_list_stock_on_market"),
    },
    {
      label: "Vacancy Rate",
      value: vac != null ? `${trim(vac * 100)}%` : "—",
      cg: impact("prop_list_house_vacancy_rate"),
      differs:
        "The website headlines the all-dwellings vacancy rate (Belmont North 0.41%). The API serves houses and units separately (houses 0.355%, units none).",
    },
  ];
  const tone = (v: number | null) => (v == null ? "" : v > 0.5 ? "ok" : v < -0.5 ? "bad" : "warn");

  return (
    <section id="overview" className="scroll-mt-44 overflow-hidden rounded-[24px] border border-line bg-card shadow-card">
      <Calls results={[summary, price, growth12, months, dom, stock, vacancy, drivers]} />
      <div className="px-5 pt-5 sm:px-8">
        <NotInApi
          what="Aerial photo band across the top of the card"
          note="The website shows an aerial image of the suburb with its outline. The API serves the outline (shapes/boundary) but no imagery."
        />
      </div>
      <div className="grid gap-10 px-5 pb-8 pt-4 sm:px-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em]">{s?.area_name ?? name}</h1>
          <p className="mt-1 text-[15px] text-slate">
            {s?.state_abbr} {s?.postcode} — Suburb Report
          </p>
          <p className="mb-4 mt-1 text-[11.5px] font-medium uppercase tracking-[.08em] text-faint">
            Data as of {dayMonthYear(p?.as_of)}
            <Differs>
              The API stamps as_of with the end of the current week, which can be days after today (2026-11-15 on 12 Nov). The website
              clamps it to today.
            </Differs>
          </p>
          <div className="overflow-hidden rounded-2xl">
            <HeroMap suburb={name} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-end">
          <h3 className="text-[13px] font-bold uppercase tracking-[.06em]">Market Snapshot</h3>
          <p className="mb-4 text-[13.5px] text-slate">Median sale prices and 12 month growth</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatTile
              value={siteMoney(p?.house)}
              label="Houses"
              delta={g.house != null && p?.house != null ? `${trim(Math.abs(g.house))}%` : undefined}
              deltaTone={(g.house ?? 0) < 0 ? "down" : "up"}
            />
            <StatTile
              value={
                <>
                  {siteMoney(p?.unit)}
                  {p?.unit != null && isBN && (
                    <Differs>
                      The website withholds the Belmont North unit median (too few unit sales) and shows a dash. The API serves $705k and +6.82%.
                    </Differs>
                  )}
                </>
              }
              label="Units"
              delta={g.unit != null && p?.unit != null ? `${trim(Math.abs(g.unit))}%` : undefined}
              deltaTone={(g.unit ?? 0) < 0 ? "down" : "up"}
            />
          </div>

          <h3 className="text-[14px] font-bold">{s?.area_name ?? name} Supply and Demand Indicators</h3>
          <p className="mb-4 text-[12.5px] text-slate">Key market indicators and their impact on capital growth</p>
          <div className="grid grid-cols-2 gap-3">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`flex items-center justify-between gap-2 rounded-2xl border border-line border-l-4 bg-card px-4 py-3 ${
                  { ok: "border-l-ok", bad: "border-l-bad", warn: "border-l-warn", "": "" }[tone(k.cg)]
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[22px] font-semibold tabular-nums">{k.value}</div>
                  <div className="text-[12px] text-slate">
                    {k.label}
                    {k.differs && isBN && <Differs>{k.differs}</Differs>}
                  </div>
                </div>
                {k.cg != null && (
                  <div
                    className={`text-right text-[12px] font-semibold ${
                      { ok: "text-ok-deep", bad: "text-bad", warn: "text-warn", "": "" }[tone(k.cg)]
                    }`}
                  >
                    {k.cg >= 0 ? "+" : ""}
                    {trim(k.cg)}%<div className="text-[10.5px] font-normal text-faint">growth/yr</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
