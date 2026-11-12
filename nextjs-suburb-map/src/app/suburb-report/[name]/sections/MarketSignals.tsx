import { shortName } from "@/lib/api";
import { type Json, get } from "../load";
import { type MapLayer, SectionMap } from "../SectionMap";
import { Badge, Calls, Chip, Differs, NotInApi, ReportCard, SectionTitle, SignalRow, type Tone, WithMap } from "../ui";

/*
 * Market Signals: one row per price driver, the suburb's microburbs mapped on
 * the side. Same rows and order as the website's MarketSignalsPanel: median
 * sale price, past year growth, investor concentration, mortgage stress,
 * negative gearing, recent repeat sales, affordability, land value, built year.
 */

const LAYERS: MapLayer[] = [
  { key: "price", label: "Median sale price", tail: "market/median-price-map", field: "median_price", format: "money", ramp: "blue" },
  { key: "growth", label: "Past year growth", tail: "market/growth-map", field: "growth_1y_pct", format: "pct", ramp: "green" },
  { key: "investor", label: "Investor concentration", tail: "market/investor-concentration", field: "pct_investment", format: "pct", ramp: "violet" },
  { key: "stress", label: "Mortgage stress", tail: "market/mortgage-stress", field: "score", format: "score", ramp: "heat" },
  { key: "ng", label: "Negative gearing", tail: "market/negative-gearing-map", field: "neg_geared_pct", format: "pct", ramp: "magma" },
  { key: "lv", label: "Land value $/sqm", tail: "market/land-values", field: "lv_sqm", format: "money", ramp: "teal" },
  { key: "built", label: "Built year", tail: "market/built-year", field: "median_yr", format: "years", ramp: "blue" },
];

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const trim = (n: number, dp = 1) => String(Number(n.toFixed(dp)));

/** $1.05M, $631k: the website's short price. */
function short(n: unknown) {
  if (!isNum(n)) return "–";
  if (n >= 1e6) return `$${trim(n / 1e6, 2)}M`;
  return `$${Math.round(n / 1e3)}k`;
}

export default async function MarketSignals({ name }: { name: string }) {
  const sub = shortName(name);
  const [price, priceMap, growthMap, investor, stress, ngMap, repeat, afford, land, built, drivers] = await Promise.all([
    get<Json>(name, "market/median-sale-price"),
    get<Json>(name, "market/median-price-map"),
    get<Json>(name, "market/growth-map"),
    get<Json>(name, "market/investor-concentration"),
    get<Json>(name, "market/mortgage-stress"),
    get<Json>(name, "market/negative-gearing-map"),
    get<Json>(name, "market/repeat-sales"),
    get<Json>(name, "market/affordability"),
    get<Json>(name, "market/land-values"),
    get<Json>(name, "market/built-year"),
    get<Json>(name, "market/growth-drivers"),
  ]);

  const driver = (key: string) => (drivers.data?.drivers ?? []).find((d: Json) => d.key === key) ?? null;
  const impact = (d: Json) =>
    isNum(d?.impact_pct_per_year) ? `${d.impact_pct_per_year > 0 ? "+" : ""}${trim(d.impact_pct_per_year, 2)}%/yr` : null;
  const impactTone = (d: Json): Tone => (d?.direction === "positive" ? "good" : d?.direction === "negative" ? "bad" : "warn");

  const house = price.data?.house;
  const lo = priceMap.data?.lowest?.median_price;
  const hi = priceMap.data?.highest?.median_price;

  // The site's renters figure is the growth-driver one, not investor-concentration's rental share.
  const renters = driver("mib_perc_renters");
  const renterPct = isNum(renters?.value) ? renters.value * 100 : null;
  const icTier = renterPct == null ? null : renterPct < 7 ? "Owner-Occupier Dominated" : renterPct < 15 ? "Mixed" : "Investor-Heavy";
  const rentalShare = investor.data?.rental_share_pct;

  const ms = stress.data?.score;
  const msBand = !isNum(ms) ? null : ms < 25 ? "Very low" : ms < 50 ? "Low" : ms < 75 ? "Elevated" : "High";

  const rs = repeat.data;
  const loss = driver("prop_list_pct_of_sold_at_loss_house");
  const af = afford.data;
  const lv = land.data;
  const by = built.data;

  return (
    <ReportCard id="market-signals">
      <Calls results={[price, priceMap, growthMap, investor, stress, ngMap, repeat, afford, land, built, drivers]} />
      <SectionTitle
        icon="〰"
        title={`Market Signals, ${sub}`}
        sub={`Each row is a price driver in ${sub}. Tap to expand. The map shows Microburb-level detail; pick a layer to switch.`}
      />
      <WithMap map={<SectionMap suburb={name} layers={LAYERS} />}>
        <div className="grid gap-2.5">
          {/* 1. Median sale price */}
          <SignalRow
            icon="🏷️"
            title={`Median sale price — ${short(house)}`}
            desc={
              isNum(lo) && isNum(hi)
                ? `Per microburb ${short(lo)} – ${short(hi)} · light blue = lower, dark blue = higher`
                : "No per-microburb prices for this suburb."
            }
          />

          {/* 2. Past year growth */}
          <SignalRow
            icon="📈"
            title="Past year growth (per microburb)"
            desc={
              growthMap.data?.n_microburbs
                ? `Price growth over the past year, per microburb (faded = lower, dark green = higher). ${growthMap.data.n_microburbs} microburbs mapped.`
                : "No per-microburb growth for this suburb yet."
            }
          />

          {/* 3. Investor concentration */}
          <SignalRow
            icon="💼"
            title="Investor Concentration"
            desc={
              <>
                {renterPct != null
                  ? `${trim(100 - renterPct, 0)}% owner-occupied · ${trim(renterPct, 0)}% renters · ${icTier}.`
                  : "–"}
                {isNum(rentalShare) && (
                  <>
                    {" "}
                    ({trim(rentalShare)}% of properties rented
                    <Differs>market/investor-concentration rental_share_pct (share of properties rented) is a different measure from the renters share the site prints</Differs>)
                  </>
                )}
                <div className="mt-1.5">
                  <NotInApi compact what="National rank badge (Top or Bottom X% nationally)" />
                </div>
              </>
            }
            chip={icTier ? <Chip tone="warn">{icTier}</Chip> : undefined}
          >
            Renters share from <code>market/growth-drivers</code> (mib_perc_renters); per-microburb investment share from{" "}
            <code>market/investor-concentration</code>. Growth impact the API gives this renters band: {impact(renters) ?? "–"}.
          </SignalRow>

          {/* 4. Mortgage stress */}
          {isNum(ms) ? (
            <SignalRow
              icon="🏚️"
              badge={
                <Badge
                  tone={ms < 50 ? "good" : "bad"}
                  top={ms >= 50 ? `Top ${Math.round(100 - ms)}%` : `Bottom ${Math.round(ms)}%`}
                  bottom="Nationally"
                />
              }
              title="Mortgage Stress"
              desc={`${Math.round(ms)}/100 across ${stress.data?.mbs?.length ?? 0} Microburbs. ${msBand} stress. Pick the layer for per-Microburb scores.`}
              chip={<Chip tone={ms < 50 ? "good" : "bad"}>{msBand}</Chip>}
            />
          ) : (
            <NotInApi what="Mortgage Stress" note={stress.message} />
          )}

          {/* 5. Negative gearing */}
          <SignalRow
            icon="🧾"
            title="Negative gearing"
            desc={
              <>
                {isNum(af?.pct_neg_gearing)
                  ? `${Math.round(af.pct_neg_gearing)}% of dwellings held by negatively-geared landlords.`
                  : "–"}
                <div className="mt-1.5">
                  <NotInApi compact what="Negative-gearing exposure tier (Low / Moderate / High) and its capital-growth pill" />
                </div>
              </>
            }
          >
            Suburb share from <code>market/affordability</code> (pct_neg_gearing). The map layer,{" "}
            <code>market/negative-gearing-map</code>, is the share of each block&apos;s likely investment properties that are
            negatively geared: a different measure from the site&apos;s per-microburb exposure score.
          </SignalRow>

          {/* 6. Recent repeat sales */}
          {rs ? (
            <SignalRow
              icon="🔁"
              badge={impact(loss) ? <Badge tone={impactTone(loss)} top={impact(loss)} bottom="Capital growth impact" /> : undefined}
              title="Recent Repeat Sales"
              desc={
                <>
                  {isNum(rs.n) && rs.n > 0 ? `${trim((rs.n_loss / rs.n) * 100, 0)}% sold at a loss` : "–"}
                  <Differs>API n_loss is 0 for every sample suburb; the site shows 5% sold at a loss for Belmont North</Differs>
                  {" · "}
                  {Number(rs.n).toLocaleString("en-AU")} resales on record ·{" "}
                  {isNum(rs.avg_annual_growth_pct) ? `+${trim(rs.avg_annual_growth_pct)}%/yr average realised growth` : "–"}
                  <Differs>API gives the mean (avg_annual_growth_pct); the site shows the median</Differs>. A recent sample of{" "}
                  {rs.points?.length ?? 0} resales comes with coordinates for a dot map.
                </>
              }
              chip={<Chip tone="good">{!isNum(loss?.value) || loss.value <= 0.15 ? "Low distress" : "Watch"}</Chip>}
            />
          ) : (
            <NotInApi what="Recent Repeat Sales" note={repeat.message} />
          )}

          {/* 7. Affordability */}
          {af ? (
            <SignalRow
              icon="💰"
              title="Affordability"
              desc={
                <>
                  {af.index}/100. Price/salary {isNum(af.price_to_salary) ? `${Math.round(af.price_to_salary)}x` : "–"}. {af.zone}.
                  <div className="mt-1.5 grid gap-1.5">
                    <NotInApi compact what="National price/salary median" />
                    <NotInApi compact what="Capital-growth impact of the band" />
                  </div>
                </>
              }
              chip={af.zone ? <Chip tone="info">{af.zone}</Chip> : undefined}
            >
              Postcode {af.poa}. Average salary ${Math.round(af.avg_salary ?? 0).toLocaleString("en-AU")}; welfare{" "}
              {isNum(af.welfare_pct) ? trim(af.welfare_pct) : "–"}%. The API also gives a forecast growth of{" "}
              {isNum(af.forecast_cg_pa) ? trim(af.forecast_cg_pa, 2) : "–"}%/yr (direction &ldquo;{af.cg_direction}&rdquo;), which
              the website does not show.
            </SignalRow>
          ) : (
            <NotInApi what="Affordability" note={afford.message} />
          )}

          {/* 8. Land value */}
          {lv && isNum(lv.median_lv_sqm) ? (
            <SignalRow
              icon="🏛️"
              badge={
                isNum(lv.land_share_of_price) ? (
                  <Badge tone="warn" top={`${Math.round(lv.land_share_of_price * 100)}%`} bottom="Land share" />
                ) : undefined
              }
              title="Land Value"
              desc={`$${Math.round(lv.median_lv_sqm).toLocaleString("en-AU")}/sqm · ${Math.round(lv.median_land_size ?? 0)}sqm median lot.`}
              chip={
                isNum(lv.land_share_of_price) ? (
                  <Chip tone="info">
                    {lv.land_share_of_price >= 0.7 ? "High" : lv.land_share_of_price >= 0.4 ? "Moderate" : "Low"}
                  </Chip>
                ) : undefined
              }
            >
              Median land value ${Math.round(lv.median_land_value ?? 0).toLocaleString("en-AU")} against a median price of{" "}
              {short(lv.median_price)}, from {Number(lv.n_parcels ?? 0).toLocaleString("en-AU")} parcels.
            </SignalRow>
          ) : (
            <NotInApi what="Land Value" note={land.message ?? "No land values for this suburb."} />
          )}

          {/* 9. Built year */}
          {by && isNum(by.median_yr) ? (
            <SignalRow
              icon="🔨"
              title="Built Year"
              desc={
                <>
                  Median home built {by.median_yr} · {Number(by.n_props).toLocaleString("en-AU")} properties across {by.n_mbs}{" "}
                  Microburbs · range {by.p10_yr}–{by.p90_yr}.
                  <div className="mt-1.5">
                    <NotInApi compact what="Capital-growth impact of the build era" />
                  </div>
                </>
              }
              chip={<Chip tone="info">{by.median_yr < 1960 ? "Established" : by.median_yr < 2005 ? "Mature" : "Newer"}</Chip>}
            >
              Most common build era: {String(by.modal_era ?? "–").replace("_", "–")}.
            </SignalRow>
          ) : (
            <NotInApi what="Built Year" note={built.message} />
          )}
        </div>
      </WithMap>
    </ReportCard>
  );
}
