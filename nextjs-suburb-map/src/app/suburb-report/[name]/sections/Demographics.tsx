import { shortName } from "@/lib/api";
import { int } from "@/lib/format";
import { type Json, get } from "../load";
import type { MapLayer } from "../SectionMap";
import { SectionMap } from "../SectionMap";
import { Badge, Calls, Chip, Differs, NotInApi, ReportCard, SectionTitle, SignalRow, type Tone, WithMap } from "../ui";
import { PopulationChart } from "./PopulationChart";

/*
 * Demographics, as the website lays it out: indicator rows on the left with a
 * per-microburb map on the right, then population over time and the local
 * business mix.
 */

const LAYERS: MapLayer[] = [
  { key: "renters", label: "Renters", tail: "demographics/tenure", field: "renting_pct", format: "pct", ramp: "teal" },
  { key: "vote", label: "Winning party share", tail: "demographics/voting-map", field: "winner_pct", format: "pct", ramp: "violet" },
  { key: "ci", label: "Cultural integration", tail: "demographics/cultural-integration", field: "score_100", format: "score", ramp: "green" },
  { key: "income", label: "Income", tail: "demographics/income-map", field: "weekly_income", format: "perWeek", ramp: "violet", legend: "Median weekly household income" },
  { key: "private", label: "Private school", tail: "demographics/private-school", field: "private_school_pct", format: "pct", ramp: "blue" },
  { key: "unemp", label: "Unemployment", tail: "demographics/unemployment", field: "unemployment_pct", format: "pct", ramp: "heat" },
  { key: "sp", label: "Single parents", tail: "demographics/single-parents-map", field: "single_parent_pct", format: "pct", ramp: "magma" },
  { key: "pop", label: "Population", tail: "demographics/population-map", field: "population", format: "int", ramp: "blue", legend: "Residents per block" },
];

const sign = (n: number, dp = 2) => `${n > 0 ? "+" : ""}${Number(n.toFixed(dp))}%/yr`;
const cgTone = (n: number | null | undefined): Tone => (n == null ? "neutral" : n > 0.05 ? "good" : n < -0.05 ? "bad" : "warn");

/** "Capital growth impact" badge, or a gap marker when the API has no figure. */
function Cg({ v }: { v: number | null | undefined }) {
  return typeof v === "number" ? <Badge top={sign(v)} bottom="Capital growth impact" tone={cgTone(v)} /> : <GapBadge />;
}
/** National rank badge: "Top 45%" over "Nationally". `pctile` is 0-100, higher = more. */
function Rank({ pctile }: { pctile: number | null | undefined }) {
  if (typeof pctile !== "number") return <GapBadge />;
  const top = pctile >= 50;
  return <Badge top={`${top ? "Top" : "Bottom"} ${top ? Math.round(100 - pctile) : Math.round(pctile)}%`} bottom="Nationally" tone="warn" />;
}
/** The site shows a badge here; the API has nothing to fill it with. */
function GapBadge() {
  return <Badge top="rank" bottom="not in API" tone="warn" />;
}

export default async function DemographicsSection({ name }: { name: string }) {
  const [tenure, voting, ci, under, cohorts, drivers, investors, incomeMap, priv, unemp, sp, pop, biz] = await Promise.all([
    get<Json>(name, "demographics/tenure"),
    get<Json>(name, "demographics/voting"),
    get<Json>(name, "demographics/cultural-integration"),
    get<Json>(name, "demographics/underclass-drag"),
    get<Json>(name, "demographics/cohorts"),
    get<Json>(name, "market/growth-drivers"),
    get<Json>(name, "market/investor-concentration"),
    get<Json>(name, "demographics/income-map"),
    get<Json>(name, "demographics/private-school"),
    get<Json>(name, "demographics/unemployment"),
    get<Json>(name, "demographics/single-parents"),
    get<Json>(name, "demographics/population-history"),
    get<Json>(name, "demographics/business"),
  ]);
  const short = shortName(name);
  const t = tenure.data;
  const v = voting.data;
  const c = ci.data;
  const u = under.data;
  const metric = (field: string) => (cohorts.data?.metrics ?? []).find((m: Json) => m.field === field);
  const driver = (key: string) =>
    (drivers.data?.drivers ?? []).find((d: Json) => d.category === "demographics" && d.key === key)?.impact_pct_per_year as number | undefined;
  const renters = metric("mib_perc_renters")?.value_pct as number | undefined;
  const overseas = metric("census_overseas_born_parents")?.value_pct as number | undefined;
  const im = incomeMap.data;
  const p = pop.data;
  const b = biz.data;

  const rows = (
    <div className="grid gap-2">
      {/* 1. Investor Concentration */}
      <SignalRow
        icon="🔑"
        badge={<Cg v={driver("mib_perc_renters")} />}
        title={
          <>
            Investor Concentration
            <Differs>The site prints a smaller growth impact for the same renter share, and calls the suburb Mixed where the API says Investor-Heavy.</Differs>
          </>
        }
        desc={renters != null ? `${Math.round(renters)}% renters · ${t?.tier ?? "–"}` : "–"}
        chip={t?.tier ? <Chip tone="info">{t.tier}</Chip> : undefined}
      >
        Renter share from <code>demographics/cohorts</code> (mib_perc_renters); verdict from <code>demographics/tenure</code>.
        {investors.data && (
          <>
            {" "}
            <code>market/investor-concentration</code> gives a different renter share, {investors.data.rental_share_pct}% (
            {int(investors.data.rental_properties)} of {int(investors.data.total_properties)} properties), counted from rental
            listings rather than households.
          </>
        )}
      </SignalRow>

      {/* 2. Voting */}
      {v ? (
        <SignalRow
          icon="🗳️"
          badge={<Badge top={`${Math.round(v.margin_pct)}%`} bottom="Margin" tone="neutral" />}
          title="Voting"
          desc={`${v.winner?.label} ${v.winner?.pct}% · ${v.runner_up?.label} ${v.runner_up?.pct}% · margin ${Math.round(v.margin_pct)}%`}
          chip={<Chip tone="info">{v.lean}</Chip>}
        >
          {(v.parties ?? [])
            .slice(0, 6)
            .map((x: Json) => `${x.label} ${x.pct}%`)
            .join(" · ")}
          <div className="mt-1 text-faint">{v.projection}</div>
        </SignalRow>
      ) : (
        <NotInApi what="Voting" compact />
      )}

      {/* 3. Cultural Integration */}
      {c ? (
        <SignalRow
          icon="🤝"
          badge={<Cg v={c.cg_impact_pct_yr} />}
          title="Cultural Integration"
          desc={`${c.score_100}/100 · top ${Math.round(100 - c.percentile)}%`}
          chip={<Chip tone="good">{c.tier}</Chip>}
        >
          Most integrated: {c.most_integrated?.street} ({c.most_integrated?.score_100}). Least: {c.least_integrated?.street} (
          {c.least_integrated?.score_100}).
        </SignalRow>
      ) : (
        <NotInApi what="Cultural Integration" compact />
      )}

      {/* 4. Overseas Born */}
      <SignalRow
        icon="🌏"
        badge={<Cg v={driver("census_overseas_born_parents")} />}
        title={
          <>
            Overseas Born
            <Differs>The site prints about half the API&apos;s growth impact for this indicator.</Differs>
          </>
        }
        desc={overseas != null ? `${Math.round(overseas)}% of parents born overseas` : "–"}
      >
        Share from <code>demographics/cohorts</code>; growth impact from <code>market/growth-drivers</code>.
      </SignalRow>

      {/* 5. Underclass Drag */}
      {u ? (
        <SignalRow
          icon="🏚️"
          badge={<Cg v={u.growth_impact?.pct_per_year} />}
          title="Underclass Drag"
          desc={`${u.welfare_dependency_pct}% welfare dependency · ${u.public_housing_pct}% public housing`}
          chip={<Chip tone="warn">{u.tier}</Chip>}
        >
          Band: {u.growth_impact?.band}.
        </SignalRow>
      ) : (
        <NotInApi what="Underclass Drag" compact />
      )}

      {/* 6. Housing Tenure */}
      {t ? (
        <SignalRow
          icon="🏠"
          badge={<Cg v={driver("mib_perc_renters")} />}
          title="Housing Tenure"
          desc={`${t.owned_outright_pct}% outright · ${t.mortgaged_pct}% mortgaged · ${t.renting_pct}% renting`}
          chip={<Chip tone="info">{t.tier}</Chip>}
        >
          <TenureBar o={t.owned_outright_pct} m={t.mortgaged_pct} r={t.renting_pct} />
        </SignalRow>
      ) : (
        <NotInApi what="Housing Tenure" compact />
      )}

      {/* 7. Income */}
      {im ? (
        <SignalRow
          icon="💵"
          badge={<Rank pctile={im.national_percentile} />}
          title="Income"
          desc={`$${int(im.median_weekly_income)}/wk · top ${Math.round(100 - im.national_percentile)}%`}
          chip={<Chip tone="warn">verdict not in API</Chip>}
        >
          Highest: {im.highest?.street} (${int(im.highest?.weekly_income)}/wk). Lowest: {im.lowest?.street} ($
          {int(im.lowest?.weekly_income)}/wk).
        </SignalRow>
      ) : (
        <NotInApi what="Income" compact />
      )}

      {/* 8. Private School Students */}
      {priv.data ? (
        <SignalRow
          icon="🎓"
          badge={<GapBadge />}
          title="Private School Students"
          desc={`${priv.data.private_school_pct}% of residents attend Catholic/Independent schools`}
        >
          The site shows a national rank here; the API has none. It does give a growth impact the site does not show:{" "}
          {sign(priv.data.growth_impact?.pct_per_year ?? 0, 1)} ({priv.data.growth_impact?.band}).
        </SignalRow>
      ) : (
        <NotInApi what="Private School Students" compact />
      )}

      {/* 9. Unemployment */}
      {unemp.data ? (
        <SignalRow
          icon="📉"
          badge={<GapBadge />}
          title="Unemployment"
          desc={`${unemp.data.unemployment_pct}% · national median ${unemp.data.national_median_pct}%`}
          chip={<Chip tone={unemp.data.vs_national === "below" ? "good" : "bad"}>{unemp.data.vs_national === "below" ? "Below" : "Above"}</Chip>}
        />
      ) : (
        <NotInApi what="Unemployment" compact />
      )}

      {/* 10. Single Parents */}
      {sp.data ? (
        <SignalRow
          icon="🚶"
          badge={<GapBadge />}
          title="Single Parents"
          desc={`${Math.round(sp.data.single_parent_pct)}% · national median ${sp.data.national_median_pct}%`}
        />
      ) : (
        <NotInApi what="Single Parents" compact />
      )}

      {/* 11. Jobs & Industry */}
      <div className="rounded-xl border border-line bg-card px-3.5 py-3">
        <div className="mb-2 text-[14.5px] font-semibold">💼 Jobs &amp; Industry</div>
        <NotInApi
          compact
          what="Occupation mix (professionals, trades, …) and the blue-collar / white-collar verdict"
          planned="/v1/suburbs/{name}/area-stats/occupation"
        />
      </div>
    </div>
  );

  // Population chart series (years as mid-year dates for the time axis).
  const yr = (y: number) => `${y}-06-30`;
  const suburbSeries = [
    {
      name: `${short} suburb`,
      color: "#3b82f6",
      points: (p?.suburb_series ?? []).map((r: Json) => ({ date: yr(r.year), value: r.population })),
    },
  ];
  const lgaActual = (p?.lga_series ?? []).filter((r: Json) => !r.projected);
  const lgaProj = (p?.lga_series ?? []).filter((r: Json) => r.projected);
  const lgaSeries = [
    { name: `${p?.lga ?? "Council area"} council area`, color: "#f97316", points: lgaActual.map((r: Json) => ({ date: yr(r.year), value: r.population })) },
    {
      name: "forward projection",
      color: "#fdba74",
      points: [...lgaActual.slice(-1), ...lgaProj].map((r: Json) => ({ date: yr(r.year), value: r.population })),
    },
  ];

  return (
    <ReportCard id="demographics">
      <Calls results={[tenure, voting, ci, under, cohorts, drivers, investors, incomeMap, priv, unemp, sp, pop, biz]} />
      <SectionTitle icon="👥" title={`Demographics, ${short}`} sub="Population, housing tenure, and community indicators" />
      <WithMap map={<SectionMap suburb={name} layers={LAYERS} />}>{rows}</WithMap>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line p-4">
          <div className="mb-2 text-[15px] font-semibold">
            Population{" "}
            <span className="text-[12.5px] font-normal text-slate">
              {p ? `${int(p.current_population)} residents in ${p.microburb_count} microburbs` : ""}
            </span>
          </div>
          {p ? (
            <>
              <div className="mb-3 grid gap-2 text-[12.5px]">
                <div className="rounded-lg border border-line px-3 py-2">
                  {short} grew {int(p.suburb_growth?.start_population)} → {int(p.suburb_growth?.end_population)}{" "}
                  <span className="text-ok-deep">(+{p.suburb_growth?.pct_change}%)</span> from {p.suburb_growth?.start_year} to{" "}
                  {p.suburb_growth?.end_year}
                </div>
                <div className="rounded-lg border border-line px-3 py-2">
                  {p.lga} council area grew {int(p.lga_growth?.start_population)} → {int(p.lga_growth?.end_population)}{" "}
                  <span className="text-ok-deep">(+{p.lga_growth?.pct_change}%)</span> from {p.lga_growth?.start_year} to{" "}
                  {p.lga_growth?.end_year}
                </div>
                {p.lga_projection && (
                  <div className="rounded-lg border border-line px-3 py-2">
                    {p.lga} projection (to {p.lga_projection.to_year}){" "}
                    <span className="text-ok-deep">↑{p.lga_projection.pct_change}%</span> · our data
                  </div>
                )}
              </div>
              <PopulationChart suburb={suburbSeries} lga={lgaSeries} />
            </>
          ) : (
            <NotInApi what="Population history" />
          )}
        </div>

        <div className="rounded-2xl border border-line p-4">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[.08em] text-faint">{short} business directory</div>
          {b ? (
            <>
              <div className="rounded-xl border border-line bg-ink/[.03] p-3.5">
                <span className="inline-flex rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.06em] text-on-ink">
                  {b.pattern?.label}
                </span>
                <div className="mt-1 text-[10.5px] uppercase tracking-[.08em] text-faint">Business-mix pattern</div>
                <div className="mt-1.5 text-[15px] font-semibold">{b.pattern?.headline}</div>
                <div className="mt-1 text-[13px] text-slate">{b.pattern?.subline}</div>
              </div>
              <div className="mt-4 text-[14.5px] font-semibold">Local business mix</div>
              <div className="text-[11px] uppercase tracking-[.08em] text-faint">Distinctive local venues · grouped by category</div>
              <div className="mt-2 grid gap-1.5">
                {(b.distinctive_categories ?? []).map((d: Json) => (
                  <SignalRow
                    key={d.category}
                    icon="📍"
                    title={d.category}
                    desc={d.examples?.length ? d.examples.join(", ") : undefined}
                    chip={
                      <span className="shrink-0 text-[12px] text-slate">
                        {d.count} · {d.times_more_common}x more common
                      </span>
                    }
                  >
                    {d.count} businesses in this suburb classified as {String(d.category).toLowerCase()}. That is roughly{" "}
                    {d.times_more_common}x more common than in a typical Australian suburb.
                  </SignalRow>
                ))}
              </div>
              {b.busiest_street_footnote && (
                <div className="mt-3 rounded-xl border border-warn/30 bg-warn/[.07] px-3 py-2 text-[13px]">{b.busiest_street_footnote}</div>
              )}
            </>
          ) : (
            <NotInApi what="Business directory" />
          )}
        </div>
      </div>
    </ReportCard>
  );
}

function TenureBar({ o, m, r }: { o: number; m: number; r: number }) {
  const parts = [
    { k: "Owned outright", v: o, c: "#22c55e" },
    { k: "Owned with mortgage", v: m, c: "#3b82f6" },
    { k: "Renting", v: r, c: "#f97316" },
  ];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => (
          <span key={p.k} style={{ width: `${p.v}%`, background: p.c }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[12px]">
        {parts.map((p) => (
          <span key={p.k}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: p.c }} />
            {p.k} {p.v}%
          </span>
        ))}
      </div>
    </div>
  );
}
