import { shortName } from "@/lib/api";
import { get, type Json } from "../load";
import { type MapLayer, SectionMap } from "../SectionMap";
import { Calls, Chip, Differs, NotInApi, ReportCard, SectionTitle, SignalRow, SubTitle, Table, WithMap } from "../ui";

/*
 * Lifestyle, as the website shows it: the subtitle (km from CBD, amenities),
 * the Livability radar against the region, one row per livability dimension
 * with its sentence, then Amenities and Schools.
 */

// The site's row order (LifestylePanel), not the API's.
const DIMS = [
  { key: "affluence", label: "Affluence", icon: "💎" },
  { key: "family", label: "Family", icon: "👨‍👩‍👧" },
  { key: "lifestyle", label: "Lifestyle", icon: "✨" },
  { key: "safety", label: "Safety", icon: "🛡️" },
  { key: "hip", label: "Hip", icon: "🎵" },
  { key: "tranquility", label: "Tranquility", icon: "🌿" },
  { key: "convenience", label: "Convenience", icon: "📍" },
];
// Radar axes, clockwise from the top, as on the site.
const RADAR = ["affluence", "lifestyle", "hip", "convenience", "family", "safety", "tranquility"];

/** The site's band for a 0-100 score (LifestylePanel bandFor). */
function band(v: number | null): { label: string; tone: "good" | "info" | "warn" | "bad" | "neutral" } {
  if (v == null) return { label: "No data", tone: "neutral" };
  if (v >= 90) return { label: "Very high", tone: "good" };
  if (v >= 75) return { label: "High", tone: "good" };
  if (v >= 50) return { label: "Moderate", tone: "info" };
  if (v >= 25) return { label: "Low", tone: "warn" };
  return { label: "Very low", tone: "bad" };
}

function Radar({ suburb, scores, bench, benchLabel }: { suburb: string; scores: Record<string, number | null>; bench: Record<string, number> | null; benchLabel: string | null }) {
  const R = 90;
  const c = 130;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / RADAR.length - Math.PI / 2;
    return [c + Math.cos(a) * (R * v) / 100, c + Math.sin(a) * (R * v) / 100];
  };
  const poly = (vals: (number | null | undefined)[]) =>
    vals
      .map((v, i) => pt(i, v ?? 0))
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
  return (
    <figure className="mx-auto max-w-[360px]">
      <svg viewBox="0 0 260 260" className="w-full" role="img" aria-label={`Livability radar for ${suburb}`}>
        {[25, 50, 75, 100].map((r) => (
          <polygon key={r} points={poly(RADAR.map(() => r))} fill="none" stroke="var(--line)" strokeWidth="1" />
        ))}
        {RADAR.map((_, i) => {
          const [x, y] = pt(i, 100);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />;
        })}
        {bench && (
          <polygon points={poly(RADAR.map((k) => bench[k]))} fill="rgba(140,140,150,.18)" stroke="rgb(140,140,150)" strokeWidth="1.5" />
        )}
        <polygon points={poly(RADAR.map((k) => scores[k]))} fill="rgba(68,117,230,.22)" stroke="var(--brand)" strokeWidth="2" />
        {RADAR.map((k, i) => {
          const [x, y] = pt(i, 122);
          return (
            <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fontWeight="600" fill="currentColor">
              {DIMS.find((d) => d.key === k)?.label}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap justify-center gap-4 text-[12px] text-slate">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          {suburb}
        </span>
        {benchLabel && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgb(140,140,150)" }} />
            {benchLabel}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export default async function LifestyleSection({ name }: { name: string }) {
  const [livability, narrative, summary, cbd, landmarks, schools, pois] = await Promise.all([
    get<Json>(name, "lifestyle/livability"),
    get<Json>(name, "lifestyle/narrative"),
    get<Json>(name, "lifestyle/summary"),
    get<Json>(name, "lifestyle/cbd"),
    get<Json>(name, "lifestyle/landmarks"),
    get<Json>(name, "schools/all"),
    get<Json>(name, "lifestyle/pois"),
  ]);
  const short = shortName(name);
  const lv = livability.data;
  const scores: Record<string, number | null> = {};
  for (const s of lv?.scores ?? []) scores[s.key] = s.value;
  const bm = lv?.benchmark;
  const benchLabel = bm ? `${bm.region} (${bm.n_suburbs} suburbs)` : null;
  // The API's sentences can name the index behind them; this page says "our data" instead.
  const sentences: Record<string, string> = Object.fromEntries(
    Object.entries((narrative.data?.sentences ?? {}) as Record<string, string>).map(([k, v]) => [
      k,
      v.replace(/(^|[.!?]\s+)SEIFA\b/g, "$1Our data").replace(/\bSEIFA\b/g, "our data"),
    ]),
  );
  const sm = summary.data;
  const nearest = cbd.data?.nearest_city;
  const lm = landmarks.data;
  const cats: Json[] = sm?.poi_categories ?? [];

  // Per-dimension amenity counts from the POI list (the site's per-row sub-table).
  const byDim = new Map<string, Map<string, number>>();
  for (const f of pois.data?.pois?.features ?? []) {
    const p = f.properties ?? {};
    if (!p.dim) continue;
    const m = byDim.get(p.dim) ?? new Map<string, number>();
    m.set(p.category, (m.get(p.category) ?? 0) + 1);
    byDim.set(p.dim, m);
  }

  // Schools: catchments that cover the suburb plus schools nearby, one row per school.
  const schoolRows = new Map<string, { name: string; level: string; sector: string; kind: string }>();
  for (const s of schools.data?.catchment ?? []) {
    const n = s.school_name ?? s.catchment_name;
    if (n && !schoolRows.has(n)) schoolRows.set(n, { name: n, level: s.school_level_type ?? "–", sector: s.school_sector_type ?? "–", kind: "Catchment" });
  }
  for (const s of schools.data?.nearby ?? []) {
    if (s.name && !schoolRows.has(s.name)) schoolRows.set(s.name, { name: s.name, level: s.school_level_type ?? "–", sector: s.school_sector_type ?? "–", kind: "Nearby" });
  }
  const schoolList = [...schoolRows.values()];
  const mix = ["Primary", "Secondary", "Combined"]
    .map((l) => [l, schoolList.filter((s) => s.level === l).length] as const)
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${n} ${l.toLowerCase()}`)
    .join(", ");

  const mapLayers: MapLayer[] = DIMS.map((d) => ({
    key: d.key,
    label: d.label,
    tail: "lifestyle/livability-map",
    field: `scores.${d.key}`,
    format: "score",
    ramp: d.key === "safety" ? "teal" : "green",
    legend: `${d.label} score out of 100`,
  }));

  return (
    <ReportCard id="lifestyle">
      <Calls results={[livability, narrative, summary, cbd, landmarks, schools, pois]} />
      <SectionTitle
        icon="♥"
        title={`Lifestyle, ${short}`}
        sub={
          <>
            Amenities, environment, and liveability in {short}.
            {nearest?.distance_km != null && sm && (
              <>
                {" "}
                {nearest.distance_km} km from CBD · {sm.total_pois} amenities.
              </>
            )}
          </>
        }
      />

      <WithMap map={<SectionMap suburb={name} layers={mapLayers} />}>
        <div className="rounded-2xl border border-line p-3 sm:p-4">
          <SubTitle
            title="Livability"
            sub={
              lv ? (
                <>
                  {short} vs {benchLabel ?? "its region"}. Pick a score to colour the map.
                </>
              ) : undefined
            }
          />
          {lv ? (
            <Radar suburb={short} scores={scores} bench={bm?.scores ?? null} benchLabel={benchLabel} />
          ) : (
            <NotInApi what="Livability scores" note={livability.message ?? undefined} />
          )}
          {bm && (
            <p className="mt-1 text-center text-[11.5px] text-faint">
              The region benchmark covers {Object.keys(bm.scores ?? {}).length} of 7 scores, as on the website.
            </p>
          )}

          <div className="mt-4 grid gap-2">
            {DIMS.map((d) => {
              const v = scores[d.key] ?? null;
              const b = band(v);
              const sentence = sentences[d.key] ?? (d.key === "safety" ? `${short} is rated ${b.label.toLowerCase()} for safety, reflecting reported crime rates across personal, property, drug and public-order offences compared with the state average.` : null);
              const sub = byDim.get(d.key);
              return (
                <SignalRow
                  key={d.key}
                  icon={d.icon}
                  title={
                    <span>
                      {d.label} <Chip tone={b.tone}>{b.label}</Chip>
                    </span>
                  }
                  desc={sentence ?? <NotInApi compact what={`${d.label} sentence`} />}
                  chip={v != null ? <span className="text-[12px] tabular-nums text-faint">{v}/100</span> : undefined}
                >
                  <p>
                    {d.label}: {b.label} ({v ?? "–"}/100){bm?.scores?.[d.key] != null ? ` · region average ${Math.round(bm.scores[d.key])}` : ""}.
                  </p>
                  {d.key === "convenience" && (
                    <ul className="mt-2 grid gap-1 rounded-lg border border-line p-2 text-[12.5px]">
                      {nearest && (
                        <li className="flex justify-between">
                          <span>Distance to {nearest.name} CBD</span>
                          <b>{nearest.distance_km} km</b>
                        </li>
                      )}
                      {sm?.nearest_train && (
                        <li className="flex justify-between">
                          <span>Nearest station</span>
                          <b>
                            {sm.nearest_train.name} · {sm.nearest_train.dist_km} km
                          </b>
                        </li>
                      )}
                      {lm?.nearest_beach && (
                        <li className="flex justify-between">
                          <span>Nearest beach</span>
                          <b>
                            {lm.nearest_beach.name} · {lm.nearest_beach.dist_km} km
                          </b>
                        </li>
                      )}
                      {lm?.nearest_hospital && (
                        <li className="flex justify-between">
                          <span>Nearest hospital</span>
                          <b>
                            {lm.nearest_hospital.name} · {lm.nearest_hospital.dist_km} km
                          </b>
                        </li>
                      )}
                    </ul>
                  )}
                  {sub && sub.size > 0 ? (
                    <div className="mt-2">
                      <div className="text-[12px] font-medium text-faint">
                        Amenities counted toward {d.label.toLowerCase()} nearby
                        <Differs>The website groups amenities inside the suburb into its own headings (Parks and sport, Education…); the API&apos;s POI list covers a wider area with different categories.</Differs>
                      </div>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {[...sub]
                          .sort((x, y) => y[1] - x[1])
                          .map(([cat, n]) => (
                            <li key={cat} className="rounded-md bg-ink/[.05] px-2 py-0.5 text-[12px]">
                              {cat} {n}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </SignalRow>
              );
            })}

            {cats.length > 0 ? (
              <SignalRow icon="🏪" title="Amenities" desc={`${sm.total_pois} amenities across ${cats.length} categories`}>
                <Table
                  head={["Category", "Count", "Most common"]}
                  align={["l", "r", "l"]}
                  rows={cats.map((c) => [c.category, c.count, (c.top_subtypes ?? []).map((t: Json) => `${t.label} (${t.count})`).join(", ")])}
                />
              </SignalRow>
            ) : (
              <NotInApi compact what="Amenities" note={summary.message ?? undefined} />
            )}

            {schoolList.length > 0 ? (
              <SignalRow
                icon="🎓"
                title="Schools"
                desc={
                  <>
                    {schoolList.length} schools ({mix})
                    <Differs>The website lists only catchments covering a real share of the suburb plus schools inside it; the API returns every catchment touching the suburb and schools nearby.</Differs>
                  </>
                }
              >
                <Table head={["School", "Type", "Why listed"]} rows={schoolList.map((s) => [s.name, `${s.level} · ${s.sector}`, s.kind])} />
                <div className="mt-2">
                  <NotInApi compact what="Catchment coverage (% of the suburb each school zone covers)" />
                </div>
              </SignalRow>
            ) : (
              <NotInApi compact what="Schools" note={schools.message ?? undefined} />
            )}
          </div>
        </div>
      </WithMap>
    </ReportCard>
  );
}
