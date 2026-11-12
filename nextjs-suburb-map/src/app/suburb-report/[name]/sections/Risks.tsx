import { shortName } from "@/lib/api";
import { type Json, get } from "../load";
import { type MapLayer, SectionMap } from "../SectionMap";
import { Calls, Chip, Differs, NotInApi, ReportCard, SectionTitle, SignalRow, type Tone, WithMap } from "../ui";

/*
 * Risks: environmental, infrastructure and social risks, with the matched
 * capital-growth figure where one exists. Same 17 rows, in the same order, as
 * the website's RisksPanel.
 */

const LAYERS: MapLayer[] = [
  { key: "crime", label: "Crime rate", tail: "crime/by-mesh-block", field: "", format: "int", ramp: "heat", legend: "Predicted incidents per 100,000 residents a year" },
  { key: "flood", label: "Flood risk score", tail: "mesh-blocks/hazard", field: "fields.flood_risk_score.value", format: "pct100", ramp: "blue", legend: "Flood risk score (share of the maximum)" },
  { key: "fire", label: "Bushfire risk score", tail: "mesh-blocks/hazard", field: "fields.fire_risk_score.value", format: "pct100", ramp: "heat", legend: "Bushfire interface score (share of the maximum)" },
  { key: "slope", label: "Slope", tail: "mesh-blocks/hazard", field: "fields.slope_deg.value", format: "int", ramp: "magma", legend: "Average slope of the homes, degrees" },
  { key: "noise", label: "Noise", tail: "mesh-blocks/environment", field: "fields.noise_score.value", format: "int", ramp: "violet", legend: "Noise score, 0–10" },
];

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const trim = (n: number, dp = 1) => String(Number(n.toFixed(dp)));

type Status = "Safe" | "Info" | "Warning" | "Alert" | string;
const toneOf = (s: Status): Tone =>
  s === "Safe" || s === "Flat" || s === "Below average" || s === "Very low" ? "good" : s === "Info" ? "info" : s === "Alert" || s === "High" ? "bad" : "warn";

function Impact({ v }: { v: string | null | undefined }) {
  if (!v) return null;
  const tone: Tone = v.startsWith("-") ? "bad" : "warn";
  return <Chip tone={tone}>{v}</Chip>;
}

export default async function Risks({ name }: { name: string }) {
  const sub = shortName(name);
  const [counts, hazards, cg, extras, riskCounts, heritage, slope, hv, crime, crimeBreak, roads, drivers] = await Promise.all([
    get<Json>(name, "risks/property-hazard-counts"),
    get<Json>(name, "risks/all"),
    get<Json>(name, "risks/capital-growth-impact"),
    get<Json>(name, "risks/extras"),
    get<Json>(name, "risks/counts"),
    get<Json>(name, "risks/heritage-share"),
    get<Json>(name, "risks/slope"),
    get<Json>(name, "risks/hv-power-lines"),
    get<Json>(name, "crime/summary"),
    get<Json>(name, "crime/breakdown"),
    get<Json>(name, "shapes/busy-roads"),
    get<Json>(name, "market/growth-drivers"),
  ]);

  const c = counts.data ?? {};
  const x = extras.data ?? {};
  const total = c.total_properties ?? cg.data?.total_properties;
  const impactOf = (key: string): string | null => (cg.data?.hazards ?? []).find((h: Json) => h.key === key)?.impact ?? null;
  const band = (pct: number | null | undefined): Status => (!isNum(pct) || pct <= 0 ? "Safe" : pct < 50 ? "Warning" : "Alert");

  // Public housing share: the growth-driver figure (the site reads the same source).
  const ph = (drivers.data?.drivers ?? []).find((d: Json) => d.key === "census_public_housing");
  const phPct = isNum(ph?.value) ? ph.value * 100 : null;
  const phVerdict = phPct == null ? null : phPct < 1 ? "Very low" : phPct < 5 ? "Low" : phPct < 15 ? "Above average" : "High";

  const roadFeatures: Json[] = roads.data?.geojson?.features ?? [];
  const roadClasses = [...new Set(roadFeatures.map((f) => f.properties?.road_class).filter(Boolean))] as string[];
  const nRoads = roads.data?.count ?? roadFeatures.length;
  const arterial = roadClasses.some((r) => /motorway|trunk/.test(r));

  const contam = c.contamination;
  const ins = x.insurance;
  const crimeVs = crime.data?.vs_national_pct;
  const anef = c.aircraft_noise?.anef_max;
  const acid = c.acid_sulfate?.any_high_pct;
  const heritagePct = heritage.data?.heritage_pct;
  const heritageItems = riskCounts.data?.heritage_items_n;

  type Row = { key: string; icon: string; title: string; desc: React.ReactNode; status: Status; impact?: React.ReactNode; detail?: React.ReactNode };
  const rows: Row[] = [
    {
      key: "public_housing",
      icon: "🏘️",
      title: "Public housing",
      desc: (
        <>
          {phVerdict ? `${phVerdict}, ${trim(phPct!)}% of dwellings` : "–"}
          <div className="mt-1.5">
            <NotInApi compact what="Capital-growth pill for the public-housing band" note="market/growth-drivers gives this driver a different study figure, below." />
          </div>
        </>
      ),
      status: phPct == null ? "Safe" : phPct < 1 ? "Safe" : phPct < 5 ? "Info" : phPct < 15 ? "Warning" : "Alert",
      detail: (
        <>
          Share from <code>market/growth-drivers</code> (the public-housing driver); pockets by area from{" "}
          <code>shapes/public-housing-sa1</code>. The growth-drivers impact for this band is{" "}
          {isNum(ph?.impact_pct_per_year) ? `${trim(ph.impact_pct_per_year, 2)}%/yr` : "–"}
          <Differs>growth-drivers says -1.18%/yr for Belmont North; the site prints +0.4%/yr from its own band table</Differs>.
        </>
      ),
    },
    {
      key: "insurance",
      icon: "🛡️",
      title: "Landlord insurance",
      desc: ins?.n ? `~$${Math.round(ins.comp_med).toLocaleString("en-AU")}/yr comprehensive · ~$${Math.round(ins.basic_med).toLocaleString("en-AU")}/yr basic` : "–",
      status: "Info",
      detail: ins?.n ? `Median of ${ins.n} microburb quotes. Rent-default cover ~$${Math.round(ins.rent_med ?? 0)}/yr.` : undefined,
    },
    {
      key: "noise",
      icon: "🔊",
      title: "Noise",
      desc: (
        <>
          {nRoads > 0 ? `${nRoads} busy road segments cross ${sub} (${roadClasses.slice(0, 3).join(", ")}).` : "None"}
          {nRoads > 0 && <Differs>road classes from shapes/busy-roads include trunk; the site lists secondary, secondary_link, tertiary</Differs>}
        </>
      ),
      status: nRoads === 0 ? "Safe" : arterial ? "Warning" : "Safe",
      detail: "Segments and classes from shapes/busy-roads; the noise heat map is shapes/noise-heatmap.",
    },
    {
      key: "contamination",
      icon: "☣️",
      title: "Contamination",
      desc: contam && total
        ? contam.within_500m_count > 0
          ? `${contam.within_500m_pct >= 15 ? "Moderate" : "Some"}, ${contam.within_500m_count} of ${total} properties (${Math.round(contam.within_500m_pct)}%) within 500 m of a known contaminated site`
          : "None"
        : "–",
      status: contam?.within_500m_count > 0 ? "Warning" : "Safe",
      impact: <Impact v={impactOf("contamination")} />,
      detail: contam ? `${contam.within_250m_count} properties within 250 m; ${riskCounts.data?.contamination_points_n ?? "–"} contaminated sites mapped.` : undefined,
    },
    {
      key: "flood",
      icon: "🌊",
      title: "Flooding",
      desc: isNum(c.flood?.pct) && c.flood.pct > 0 ? `Some, ${Math.round(c.flood.pct)}% of properties at flood risk` : "None",
      status: band(c.flood?.pct),
      impact: <Impact v={impactOf("flood")} />,
      detail: isNum(hazards.data?.flood?.coverage_pct)
        ? `${trim(hazards.data.flood.coverage_pct)}% of the suburb's area is flood-mapped (risk band ${hazards.data.flood.risk_band ?? "–"}).`
        : undefined,
    },
    {
      key: "bushfire",
      icon: "🔥",
      title: "Bushfire",
      desc: isNum(c.bushfire?.pct) && c.bushfire.pct > 0 ? `${Math.round(c.bushfire.pct)}% of properties on bushfire prone land` : "None",
      status: band(c.bushfire?.pct),
      impact: <Impact v={impactOf("bushfire")} />,
      detail: isNum(hazards.data?.bushfire?.coverage_pct)
        ? `${trim(hazards.data.bushfire.coverage_pct)}% of the suburb's area is bushfire prone (by area, not by property).`
        : undefined,
    },
    {
      key: "heritage",
      icon: "🏛️",
      title: "Heritage",
      desc: (
        <>
          {isNum(heritagePct) && heritagePct > 0 ? `Some heritage, ${Math.round(heritagePct)}% of the suburb is inside a Heritage Conservation Area` : "None"}
          {isNum(heritageItems) ? `, ${heritageItems} listed heritage items` : ""}
          <Differs>risks/counts heritage_items_n is 0 for Belmont North; the site counts 11 listed items. heritage-share is labelled % of properties, the site says % of the suburb</Differs>
        </>
      ),
      status: isNum(heritagePct) && heritagePct > 0 ? (heritagePct >= 25 ? "Warning" : "Info") : "Safe",
    },
    {
      key: "epa",
      icon: "📄",
      title: "EPA notices",
      desc: isNum(x.epa_notices_n) && x.epa_notices_n > 0 ? `${x.epa_notices_n} EPA notices issued in this suburb` : "None",
      status: isNum(x.epa_notices_n) && x.epa_notices_n > 0 ? "Warning" : "Safe",
    },
    {
      key: "mine",
      icon: "⛏️",
      title: "Mine subsidence",
      desc: isNum(c.mine_subsidence?.pct) && c.mine_subsidence.pct > 0 ? `${Math.round(c.mine_subsidence.pct)}% of properties in a mine subsidence district` : "None",
      status: band(c.mine_subsidence?.pct),
      impact: <Impact v={impactOf("mine_subsidence")} />,
    },
    {
      key: "crime",
      icon: "🚔",
      title: "Crime",
      desc: (
        <>
          {isNum(crimeVs) ? `${crime.data.verdict}, ${Math.abs(crimeVs)}% ${crimeVs < 0 ? "below" : "above"} the national median` : "–"}
          <div className="mt-1.5">
            <NotInApi compact what="Capital-growth pill for the crime band" />
          </div>
        </>
      ),
      status: crime.data?.verdict ?? "–",
      detail: crimeBreak.data?.breakdown?.length ? (
        <ul className="grid gap-1">
          {crimeBreak.data.breakdown.map((b: Json) => (
            <li key={b.type} className="flex justify-between gap-3">
              <span>{b.label}</span>
              <span className="tabular-nums">
                {b.rate} vs {Math.round(b.national_median)} · {b.diff_pct > 0 ? "+" : ""}
                {b.diff_pct}% · {b.verdict}
              </span>
            </li>
          ))}
        </ul>
      ) : undefined,
    },
    {
      key: "aircraft",
      icon: "✈️",
      title: "Aircraft noise",
      desc: isNum(anef) ? `ANEF up to ${trim(anef)}` : "",
      status: isNum(anef) && anef >= 20 ? "Warning" : "Safe",
    },
    {
      key: "slope",
      icon: "⛰️",
      title: "Steep terrain",
      desc: isNum(slope.data?.median_slope_deg) ? `median gradient ${trim(slope.data.median_slope_deg)}°` : "–",
      status: isNum(slope.data?.median_slope_deg) ? (slope.data.median_slope_deg < 5 ? "Flat" : slope.data.median_slope_deg < 10 ? "Sloping" : "Steep") : "–",
      detail: isNum(slope.data?.steep_pct) ? `${trim(slope.data.steep_pct)}% of properties over ${slope.data.steep_threshold_deg}°.` : undefined,
    },
    {
      key: "acid",
      icon: "🧪",
      title: "Acid sulfate soils",
      desc: isNum(acid) && acid > 0 ? `${Math.round(acid)}% of properties on high-probability acid sulfate soils` : "",
      status: band(acid),
    },
    {
      key: "landslide",
      icon: "🏔️",
      title: "Landslide risk",
      desc: isNum(x.landslide_pct) && x.landslide_pct >= 1 ? `${Math.round(x.landslide_pct)}% of the suburb in a council landslide overlay` : "",
      status: isNum(x.landslide_pct) && x.landslide_pct >= 1 ? "Info" : "Safe",
    },
    {
      key: "erosion",
      icon: "〰️",
      title: "Coastal erosion",
      desc: isNum(riskCounts.data?.erosion_n) && riskCounts.data.erosion_n > 0 ? `${riskCounts.data.erosion_n} erosion areas mapped` : "",
      status: isNum(riskCounts.data?.erosion_n) && riskCounts.data.erosion_n > 0 ? "Warning" : "Safe",
    },
    {
      key: "storm",
      icon: "🌀",
      title: "Storm tide",
      desc: isNum(x.storm_tide_high_pct) && x.storm_tide_high_pct > 0 ? `${Math.round(x.storm_tide_high_pct)}% of the suburb in a high storm-tide zone` : "",
      status: isNum(x.storm_tide_high_pct) && x.storm_tide_high_pct > 0 ? "Warning" : "Safe",
    },
    {
      key: "hv",
      icon: "⚡",
      title: "High-voltage power lines",
      desc: hv.data?.present ? `${hv.data.line_count} lines${hv.data.max_kv ? `, up to ${hv.data.max_kv} kV` : ""}` : "",
      status: hv.data?.present ? "Info" : "Safe",
    },
  ];

  const clear = new Set(["Safe", "Flat", "Below average", "Very low"]);
  const flagged = rows.filter((r) => !clear.has(r.status)).length;

  return (
    <ReportCard id="risks">
      <Calls results={[counts, hazards, cg, extras, riskCounts, heritage, slope, hv, crime, crimeBreak, roads, drivers]} />
      <SectionTitle
        icon="🛡"
        title={`Risks, ${sub}`}
        sub={`Environmental, infrastructure and social risks for ${sub}, with the matched capital-growth association where we have a measured study. ${flagged} flagged · ${rows.length} tracked.`}
      />
      <WithMap
        map={
          <div className="grid gap-2">
            <SectionMap suburb={name} layers={LAYERS} />
            <NotInApi
              compact
              what="Hazard outlines on the map (bushfire, flood, heritage, erosion, landslide, acid sulfate)"
              note="The API serves them (shapes/hazards?layer=…, plus shapes/noise-heatmap, shapes/public-housing-sa1, shapes/easements) but this clone draws per-block scores instead. Contamination points, EPA notice points and aircraft-noise contours are not in the API."
            />
          </div>
        }
      >
        <div className="grid gap-2">
          {rows.map((r) => (
            <SignalRow
              key={r.key}
              icon={r.icon}
              title={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  {r.title}
                  {r.impact}
                </span>
              }
              desc={r.desc || undefined}
              chip={<Chip tone={toneOf(r.status)}>{r.status}</Chip>}
            >
              {r.detail}
            </SignalRow>
          ))}
        </div>
      </WithMap>
    </ReportCard>
  );
}
