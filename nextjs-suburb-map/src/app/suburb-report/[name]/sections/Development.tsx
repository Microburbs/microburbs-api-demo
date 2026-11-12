import { shortName } from "@/lib/api";
import type { ApiResult } from "@/lib/server/microburbs";
import { date, int } from "@/lib/format";
import { get, type Json } from "../load";
import { SectionMap } from "../SectionMap";
import { Calls, Chip, Differs, NotInApi, ReportCard, SectionTitle, SignalRow, StatTile, SubTitle, Table, WithMap } from "../ui";

/*
 * Development, as the website shows it: three tiles, the "Development Layers"
 * rows (each with its detail), then Council Intelligence.
 */

const PAGE = 500; // the API's maximum page size for development/applications
const MAX_PAGES = 4; // the website reads the newest 2,000 applications

type Application = { title: string | null; address: string | null; date: string | null; category: string | null };
type Applications = {
  total_available: number;
  next_offset: number | null;
  min_date: string | null;
  max_date: string | null;
  categories: { category: string; count: number }[];
  applications: Application[];
};

/** Every application (up to 2,000), paging with limit/offset like the site's single query. */
async function allApplications(name: string) {
  const calls: ApiResult<Applications>[] = [await get<Applications>(name, `development/applications?limit=${PAGE}`)];
  while (calls.length < MAX_PAGES) {
    const next = calls[calls.length - 1].data?.next_offset;
    if (next == null) break;
    calls.push(await get<Applications>(name, `development/applications?limit=${PAGE}&offset=${next}`));
  }
  const first = calls[0].data;
  const applications = calls.flatMap((c) => c.data?.applications ?? []);
  // Category counts summed across pages (each page counts its own rows), in the API's order.
  const counts = new Map<string, number>();
  for (const c of calls) for (const k of c.data?.categories ?? []) counts.set(k.category, (counts.get(k.category) ?? 0) + k.count);
  return { calls, first, applications, categories: [...counts].map(([category, count]) => ({ category, count })) };
}

const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default async function DevelopmentSection({ name }: { name: string }) {
  const [apps, council, supply, zoning, controls, newDw, density, profile, rates] = await Promise.all([
    allApplications(name),
    get<Json>(name, "development/council-intelligence"),
    get<Json>(name, "development/supply"),
    get<Json>(name, "development/zoning-map"),
    get<Json>(name, "development/building-controls"),
    get<Json>(name, "development/new-dwellings-map"),
    get<Json>(name, "development/density"),
    get<Json>(name, "development/profile"),
    get<Json>(name, "development/council-rates"),
  ]);
  const short = shortName(name);
  const a = apps.first;
  const ci = council.data;
  const newDwellingDas = apps.categories.find((c) => c.category === "New Dwelling")?.count ?? 0;
  const cats = apps.categories
    .slice(0, 3)
    .map((c) => `${c.count} ${c.category.toLowerCase()}`)
    .join(", ");
  const range = a?.min_date && a?.max_date ? ` from ${date(a.min_date)} to ${date(a.max_date)}` : "";

  const sup = supply.data?.summary;
  const groups: { label: string; pct: number }[] = zoning.data?.groups ?? [];
  const hob = controls.data?.hob;
  const fsr = controls.data?.fsr;
  const nd = newDw.data;
  const dn = density.data;
  const pr = profile.data;
  const cr = rates.data;
  const dpk: number | null = dn?.dwellings_per_km2 ?? null;
  const narrativeLevel = dpk == null ? null : dpk < 500 ? "Low" : dpk < 2000 ? "Moderate" : "High";
  const signals: Json[] = [...(ci?.signals ?? [])].sort((x: Json, y: Json) => (y.dollar_value ?? 0) - (x.dollar_value ?? 0));
  const activeShare = nd ? nd.active_blocks / Math.max(nd.n_microburbs, 1) : 0;

  return (
    <ReportCard id="development">
      <Calls results={[...apps.calls, council, supply, zoning, controls, newDw, density, profile, rates]} />
      <SectionTitle icon="🏗" title={`Development, ${short}`} sub={a?.max_date ? `Data as of ${date(a.max_date)}` : undefined} />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile value={a ? int(a.total_available) : "–"} label="Applications" />
        <StatTile value={ci?.summary?.pipeline_display ?? "–"} label="Council pipeline" />
        <StatTile value={a ? int(newDwellingDas) : "–"} label="New dwelling DAs" />
      </div>

      <WithMap
        map={
          <SectionMap
            suburb={name}
            layers={[
              { key: "construction", label: "Construction (new-dwelling DAs)", tail: "development/new-dwellings-map", field: "new_dwelling_applications", format: "int", ramp: "heat", legend: "New-dwelling applications" },
              { key: "density", label: "Density", tail: "development/density-map", field: "dwellings_per_km2", format: "int", ramp: "violet", legend: "Dwellings per km²" },
              { key: "supply", label: "Supply", tail: "development/supply", field: "total_new", format: "int", ramp: "teal", legend: "New dwellings, last 24 months" },
            ]}
          />
        }
      >
        <div className="rounded-2xl border border-line p-3 sm:p-4">
          <SubTitle title="Development Layers" sub="Toggle map layers with the picker. Click any row for detail." />
          <div className="grid gap-2">
            {sup ? (
              <SignalRow
                icon="🏠"
                title="Supply"
                desc={
                  <>
                    {int(sup.total_new)} new homes in the last 24 months, {Math.round(sup.pct_houses)}% houses
                    <Differs>
                      The website counts homes built since 2016 and the share of the suburb that is new; the API counts the last 24 months, and its live rollup counts a building once per nearby block (the unreleased batch counts each building once).
                    </Differs>
                  </>
                }
                chip={
                  <span className="flex gap-1">
                    <Chip tone={sup.pct_units >= 50 ? "neutral" : "good"}>{sup.pct_units >= 50 ? "Apartment-led" : "House-led"}</Chip>
                    <Chip tone="info">Info</Chip>
                  </span>
                }
              >
                <p>
                  {int(sup.new_houses)} houses and {int(sup.new_units)} units ({Math.round(sup.pct_units)}% units).
                </p>
                <div className="mt-2">
                  <NotInApi compact what="New homes since 2016, and the share of the suburb that is new" />
                </div>
              </SignalRow>
            ) : (
              <NotInApi compact what="Supply" note={supply.message ?? undefined} />
            )}

            {groups.length ? (
              <SignalRow icon="🗂" title="Zoning" desc={groups.map((g) => `${g.label} ${g.pct}%`).join(" · ")} chip={<Chip tone="good">Good</Chip>}>
                <p>Protected environmental or low-density zoning limits future supply, supporting price growth.</p>
                <ul className="mt-2 grid gap-1">
                  {(zoning.data?.legend ?? []).map((z: Json) => (
                    <li key={`${z.lay_class}${z.sym_code}`} className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: z.color }} />
                      <span className="flex-1">
                        {z.lay_class}
                        {z.sym_code ? ` (${z.sym_code})` : ""}
                      </span>
                      <span className="tabular-nums">{z.pct}%</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[12px] text-faint">The zone polygons come back as GeoJSON in the same call; this demo&apos;s map draws per-block layers only.</p>
              </SignalRow>
            ) : (
              <NotInApi compact what="Zoning" note={zoning.message ?? "No zoning mapped for this suburb."} />
            )}

            {hob ? (
              <SignalRow
                icon="📏"
                title="Maximum Height"
                desc={`${Number(hob.most_common_height_m).toFixed(0)}m limit (${Math.round(hob.pct_most_common)}% of zones), ${hob.zones_mapped} zones mapped`}
                chip={<Chip tone="info">Info</Chip>}
              >
                Council-set building height controls. Most of {short} is limited to {Number(hob.most_common_height_m).toFixed(0)}m (roughly{" "}
                {Math.round(hob.most_common_height_m / 3)} storeys). Lower limits protect neighbourhood character and restrict densification.
              </SignalRow>
            ) : (
              <NotInApi compact what="Maximum Height" note="No height controls mapped for this suburb." />
            )}

            {fsr && (
              <SignalRow
                icon="⤢"
                title="Floor Space Ratio"
                desc={fsr.median_fsr ? `Median ${fsr.median_fsr}:1` : "Conservation area (no numeric FSR)"}
                chip={<Chip tone="info">Info</Chip>}
              >
                FSR limits how much floor area can be built relative to the land area. A ratio of 0.5:1 means 500 m² of floor on a 1,000 m² lot.
                <ul className="mt-2 grid gap-1">
                  {(fsr.breakdown ?? []).map((b: Json) => (
                    <li key={b.label} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: b.color }} />
                      <span className="flex-1">{b.label}</span>
                      <span className="tabular-nums">{b.pct}%</span>
                    </li>
                  ))}
                </ul>
              </SignalRow>
            )}

            {a ? (
              <SignalRow
                icon="📄"
                title="Development Applications"
                desc={`${int(a.total_available)}${range}${cats ? `, ${cats}` : ""}`}
                chip={<Chip tone={a.total_available < 50 ? "info" : "warn"}>{a.total_available < 50 ? "Info" : "Warning"}</Chip>}
              >
                <Table
                  head={["Place", "Category", "Details", "Date"]}
                  rows={apps.applications.slice(0, 12).map((d, i) => [
                    <span key={`p${i}`} className="text-ink">
                      {d.address ?? "–"}
                    </span>,
                    d.category ?? "–",
                    <span key={`t${i}`} className="line-clamp-2">
                      {d.title ?? "–"}
                    </span>,
                    <span key={`d${i}`} className="whitespace-nowrap">
                      {date(d.date)}
                    </span>,
                  ])}
                />
                <p className="mt-2 text-[12px] text-faint">
                  Newest {Math.min(12, apps.applications.length)} of {int(a.total_available)}.
                </p>
              </SignalRow>
            ) : (
              <NotInApi compact what="Development Applications" note={apps.calls[0].message ?? undefined} />
            )}

            {nd ? (
              <SignalRow
                icon="⛑"
                title="Construction"
                desc={`${int(newDwellingDas)} new-dwelling applications across ${nd.active_blocks} of ${nd.n_microburbs} local blocks`}
                chip={<Chip tone={activeShare >= 0.25 ? "warn" : "info"}>{activeShare >= 0.25 ? "Warning" : "Info"}</Chip>}
              >
                Each block is shaded by how many new-dwelling applications have been filed inside it. {nd.active_blocks} of {nd.n_microburbs} blocks (
                {Math.round(activeShare * 100)}%) have at least one. Clusters flag the streets where new supply is most likely to hit the market over
                the next 2-3 years.
              </SignalRow>
            ) : (
              <NotInApi compact what="Construction" note={newDw.message ?? undefined} />
            )}

            {dpk != null ? (
              <SignalRow
                icon="🏢"
                title="Density"
                desc={`${int(dpk)} dwellings/km², ${dn.density_level} density`}
                chip={<Chip tone="good">Good</Chip>}
              >
                {narrativeLevel}-density suburb with {int(dpk)} dwellings per km²
                {pr?.apartment_pct != null ? ` and ${Math.round(pr.apartment_pct)}% apartments` : ""}.
                {pr?.avg_lot_m2 != null ? ` Average block size is ${int(pr.avg_lot_m2)} m².` : ""}
                <div className="mt-2 grid gap-1.5">
                  <NotInApi compact what="Capital growth impact of density (%/yr pill)" />
                  <NotInApi compact what="Microburbs (mesh blocks) within 500 m" />
                </div>
              </SignalRow>
            ) : (
              <NotInApi compact what="Density" note={density.message ?? undefined} />
            )}

            <SignalRow icon="🛰" title="Satellite change" desc="2014 vs 2026, drag to compare" chip={<Chip tone="info">Info</Chip>}>
              <NotInApi what="Satellite imagery for the before / after slider" />
            </SignalRow>

            {cr ? (
              <SignalRow icon="🪙" title="Council Rates" desc={`$${int(cr.avg_rate_aud_yr)} avg (${cr.lga})`} chip={<Chip tone="info">Info</Chip>}>
                Average council rates for the {cr.lga} council area, from our data.
              </SignalRow>
            ) : (
              <NotInApi compact what="Council Rates" note={rates.message ?? undefined} />
            )}
          </div>
        </div>
      </WithMap>

      {signals.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-line p-3 sm:p-4">
          <SubTitle
            title={`🏛 Council Intelligence, ${ci.summary?.total_signals ?? signals.length} signals, ${ci.summary?.pipeline_display ?? "–"} pipeline`}
            sub="Sort: dollar value"
          />
          <div className="grid gap-2">
            {signals.slice(0, 5).map((s: Json) => (
              <SignalRow
                key={s.title}
                title={
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[10.5px] font-medium uppercase tracking-[.08em] text-faint">{String(s.type ?? "signal").replace(/_/g, " ")}</span>
                    {s.title}
                  </span>
                }
                chip={
                  <span className="flex items-center gap-2">
                    {s.stage && <Chip>{title(String(s.stage))}</Chip>}
                    {s.dollar_display && <span className="text-[13px] font-semibold text-brand-deep">{s.dollar_display}</span>}
                  </span>
                }
              >
                <p>{s.description}</p>
                {s.evidence && <p className="mt-1 italic">“{s.evidence}”</p>}
                <p className="mt-1 text-[12px] text-faint">
                  {s.location && <span>📍 {s.location} </span>}
                  {s.time_horizon && <span>⏱ {s.time_horizon}</span>}
                </p>
              </SignalRow>
            ))}
          </div>
          <p className="mt-2 text-right text-[12px] text-faint">
            1–{Math.min(5, signals.length)} of {signals.length} signals
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <NotInApi what="Council Intelligence" note={council.message ?? undefined} />
        </div>
      )}
    </ReportCard>
  );
}
