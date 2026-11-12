import type { Point } from "@/lib/api";
import { dayMonthYear, siteMoney, trim } from "../fmt";
import { get, type Json } from "../load";
import { SalesChart } from "../SalesChart";
import { type Street, StreetProfile } from "../StreetProfile";
import { Calls, Differs, NotInApi, ReportCard, SectionTitle, SubTitle, Table } from "../ui";

const CONFIDENCE: Record<number, string> = { 1: "LOW", 2: "MEDIUM", 3: "HIGH" };
const pts = (x: unknown): Point[] => (Array.isArray(x) ? (x as Point[]) : []);

function Kpi({ value, label, delta, wide }: { value: React.ReactNode; label: string; delta?: number | null; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-ink/[.035] px-2 py-2.5 text-center ${wide ? "col-span-2" : ""}`}>
      {delta != null && (
        <div className={`text-[11px] font-semibold ${delta < 0 ? "text-bad" : "text-ok-deep"}`}>
          {delta < 0 ? "▼" : "▲"} {trim(Math.abs(delta), 1)}%
        </div>
      )}
      <div className="text-[16px] font-semibold tabular-nums">{value}</div>
      <div className="text-[10.5px] text-faint">{label}</div>
    </div>
  );
}

/**
 * Market Insights: suburb vs region KPIs, the 4-year forecast, past growth,
 * the Sales Data chart, Street Profile, Figures by bedroom and Recent Price
 * Movement, in the website's order.
 */
export default async function MarketInsightsSection({ name }: { name: string }) {
  const [summary, all, growth, growth12, forecast, yieldSeries, vacancySeries, streets, bedrooms, recent, tenure] = await Promise.all([
    get<Json>(name, "hero/summary"),
    get<Json>(name, "market/all"),
    get<Json>(name, "market/price-growth"),
    get<Json>(name, "hero/price-growth-12mo"),
    get<Json>(name, "forecast/sale"),
    get<Json>(name, "market/yield-pct-series"),
    get<Json>(name, "market/vacancy-rate-series"),
    get<Json>(name, "street-forecasts"),
    get<Json>(name, "market/bedroom-stats"),
    get<Json>(name, "market/recent-price-movement"),
    get<Json>(name, "demographics/tenure"),
  ]);
  const isBN = name === "Belmont North";
  const s = summary.data;
  const m = all.data ?? {};
  const region = s?.sa4 ?? "the region";
  const g1 = ((growth12.data?.growth ?? []) as Json[]).find((x) => x.property_type === "house")?.pct as number | undefined;
  const gh = growth.data?.house ?? {};
  const fc = forecast.data?.house;
  const total4y = fc?.most_likely != null ? (1 + fc.most_likely) ** 4 - 1 : null;
  const asOf = m.median_sale_price?.as_of;

  const salesSeries = {
    price: { house: pts(m.median_sale_price_series?.house), unit: pts(m.median_sale_price_series?.unit) },
    volume: { house: pts(m.transaction_volume?.house?.series), unit: pts(m.transaction_volume?.unit?.series) },
    rent: { house: pts(m.median_rent_series?.house), unit: pts(m.median_rent_series?.unit) },
    yield: { house: pts(yieldSeries.data?.house), unit: pts(yieldSeries.data?.unit) },
    vacancy: { house: pts(vacancySeries.data?.house), unit: pts(vacancySeries.data?.unit) },
  };
  const streetRows = (streets.data?.streets ?? []) as Street[];
  const bars = [
    { label: "1 Y", v: gh["1yr"] },
    { label: "3 Y", v: gh["3yr"] },
    { label: "5 Y", v: gh["5yr"] },
    { label: "10 Y", v: gh["10yr"] },
  ].filter((b) => b.v != null) as { label: string; v: number }[];
  const barMax = Math.max(0.05, ...bars.map((b) => b.v));

  return (
    <ReportCard id="market">
      <Calls results={[summary, all, growth, growth12, forecast, yieldSeries, vacancySeries, streets, bedrooms, recent, tenure]} />
      <SectionTitle icon="⌂" title={`Market Insights, ${s?.area_name ?? name}`} sub={`Data as of ${dayMonthYear(asOf)}`} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Suburb vs region */}
        <div>
          <div className="mb-3 text-[16px] font-bold">
            {s?.area_name ?? name} vs {region}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 text-[12px] font-semibold">{s?.area_name ?? name}</div>
              <div className="grid grid-cols-2 gap-1.5">
                <Kpi value={siteMoney(m.median_sale_price?.house, 1)} label="Median Sale Price" delta={g1} />
                <Kpi value={m.median_rent?.house != null ? `$${Math.round(m.median_rent.house)}` : "—"} label="Median Rent/wk" />
                <div className="col-span-2">
                  <NotInApi compact what="3Y Rent Growth" note="Site 3-year rent growth figure. The rent series gives +12.5% over 3 years for Belmont North; the website shows +25.2%." />
                </div>
                <Kpi value={m.days_on_market?.house != null ? Math.round(m.days_on_market.house) : "—"} label="Days on Market" />
                <Kpi value={m.yield_pct?.house != null ? `${trim(m.yield_pct.house * 100)}%` : "—"} label="Gross Yield" />
                <Kpi
                  wide
                  value={
                    <>
                      {tenure.data?.owner_occupied_pct != null ? `${Math.round(tenure.data.owner_occupied_pct)}%` : "—"}
                      {isBN && <Differs>The website shows 89% owner-occupied for Belmont North; demographics/tenure serves 71.6% (owned outright + mortgaged).</Differs>}
                    </>
                  }
                  label="Owner-Occupied"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold">{region}</div>
              <NotInApi
                what="Region benchmark: median price and 12m growth, rent, 3Y rent growth, days on market, yield"
                note={`The website compares every figure with ${region}. /v1/sa4/{name}/profile returns only names, and no SA4 or city market figures are served.`}
              />
            </div>
          </div>
        </div>

        {/* Forecast + past growth */}
        <div>
          <SubTitle
            title={`${s?.area_name ?? name} 4 Year Growth Forecast for Houses`}
            sub="Our forecasts identify suburbs that will outperform the national average with 85% accuracy"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line px-4 py-4 text-center">
              <div className="text-[28px] font-semibold text-ok-deep">{total4y != null ? `▲ ${Math.round(total4y * 100)}%` : "—"}</div>
              <div className="text-[12px] text-slate">Forecasted 4Y Growth</div>
              <Differs>
                Compounded from forecast/sale house.most_likely ({fc?.most_likely != null ? `${trim(fc.most_likely * 100)}%` : "—"}). The API docs call that a
                1-year forecast; the website treats it as a yearly rate over 4 years.
              </Differs>
            </div>
            <div className="rounded-2xl border border-line px-4 py-4 text-center">
              <div className="text-[18px] font-bold text-warn">{fc?.confidence != null ? (CONFIDENCE[Math.round(fc.confidence)] ?? fc.confidence) : "—"}</div>
              <div className="text-[12px] text-slate">Forecast confidence</div>
              <div className="mt-1 text-[11px] text-faint">API sends confidence as a number (1–3)</div>
            </div>
          </div>
          <div className="mt-2">
            <NotInApi compact what="National 4-year forecast average (the website's 7% benchmark)" />
          </div>

          <div className="mt-5">
            <SubTitle title="Historical Total Past Growth for Houses" sub="Past growth comparison over 1, 3, 5, and 10 years" />
            <ul className="grid gap-2">
              {bars.map((b) => (
                <li key={b.label} className="grid grid-cols-[36px_1fr_56px] items-center gap-2 text-[12.5px]">
                  <span className="font-semibold">{b.label}</span>
                  <span className="h-4 rounded bg-ink/[.06]">
                    <span className="block h-full rounded bg-ok" style={{ width: `${Math.max(2, (b.v / barMax) * 100)}%` }} />
                  </span>
                  <span className="text-right font-semibold text-ok-deep">
                    {b.v >= 0 ? "+" : ""}
                    {Math.round(b.v * 100)}%
                  </span>
                </li>
              ))}
            </ul>
            {isBN && (
              <p className="mt-1 text-[11.5px] text-faint">
                1 Y here is market/price-growth house.1yr (+8%); the website&apos;s bar reads +9%. <Differs>Site 1Y bar +9%, API 7.69%</Differs>
              </p>
            )}
            <div className="mt-2">
              <NotInApi compact what={`${region} benchmark tick on each bar`} />
            </div>
          </div>
        </div>
      </div>

      <hr className="my-7 border-line" />
      <SalesChart suburb={s?.area_name ?? name} series={salesSeries} />
      <div className="mt-2">
        <NotInApi compact what={`${region} comparison line on the chart (and same-area suburb picker series)`} />
      </div>

      <hr className="my-7 border-line" />
      <SubTitle
        title="Street Profile"
        sub={`${streets.data?.total ?? streetRows.length} streets listed in ${s?.area_name ?? name}, ${s?.state_abbr ?? ""} · ${region}`}
      />
      {streetRows.length ? (
        <StreetProfile suburb={s?.area_name ?? name} streets={streetRows} />
      ) : (
        <NotInApi what="Street forecasts for this suburb" note={streets.message ?? undefined} />
      )}
      <div className="mt-3 rounded-xl border-l-4 border-brand bg-brand-wash px-4 py-3 text-[13px] text-slate">
        The website follows the table with its national street-pick backtest (top picks outperformed by +6.8%/yr, 2012–2025). That is fixed study copy, not
        suburb data, so it is not expected from the API.
      </div>

      <hr className="my-7 border-line" />
      <SubTitle title="Figures by bedroom" sub={`Price, size, and type mix by bedroom count in ${s?.area_name ?? name}`} />
      <Table
        head={["Beds", "House Price", "Unit Price", "Recent Sales", "Median Baths", "Median Land"]}
        align={["l", "r", "r", "r", "r", "r"]}
        rows={((bedrooms.data?.bedrooms ?? []) as Json[]).map((b) => [
          `${b.bedrooms} bed`,
          <span key="h" className="font-semibold text-brand-deep">
            {siteMoney(b.house_price, 1)}
          </span>,
          siteMoney(b.unit_price, 1),
          b.n_sales?.toLocaleString("en-AU") ?? "—",
          b.median_bath ?? "—",
          b.median_land != null ? `${b.median_land} sqm` : "—",
        ])}
      />

      <hr className="my-7 border-line" />
      <SubTitle title="Recent Price Movement" sub="Last 4 weeks of smart median data" />
      <Table
        head={["Week", "House Price", "Chg", "Unit Price", "Chg", "Median Rent/wk", "Chg"]}
        align={["l", "r", "r", "r", "r", "r", "r"]}
        rows={((recent.data?.weeks ?? []) as Json[]).map((w) => {
          const chg = (v: number | null) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`);
          return [
            dayMonthYear(w.date),
            <span key="h" className="font-semibold text-brand-deep">
              {siteMoney(w.house_price)}
            </span>,
            chg(w.house_price_change_pct),
            siteMoney(w.unit_price),
            chg(w.unit_price_change_pct),
            w.house_rent != null ? `$${Math.round(w.house_rent)}` : "—",
            chg(w.house_rent_change_pct),
          ];
        })}
      />
    </ReportCard>
  );
}
