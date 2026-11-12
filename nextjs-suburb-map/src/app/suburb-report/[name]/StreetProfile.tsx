"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/LineChart";
import { siteMoney, trim } from "./fmt";

export type Street = {
  street: string;
  current_price: number | null;
  annual_2y: number | null;
  annual_4y: number | null;
  annual_8y: number | null;
  target_2y: number | null;
  target_4y: number | null;
  target_8y: number | null;
  houses_on_street: number | null;
  units_on_street: number | null;
  median_house_rent_week: number | null;
  sale_turnover: string | null;
  rental_turnover: string | null;
  renters_pct: string | null;
  history: { year: number; price: number; suburb_med: number }[];
};

const PAGE = 5;
/** "Every 12.0 years (average turnover)" → "12yr": the API sends a sentence, the website shows the number. */
const years = (s: string | null) => {
  const m = s?.match(/([\d.]+)\s*years?/);
  return m ? `${trim(Number(m[1]), 1)}yr` : "—";
};
const yr = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${trim(n, 1)}%/yr`);

/** Past growth a year, derived from the street's own price history (first year on or after 2013 to the latest). */
export function pastGrowth(h: Street["history"]) {
  const start = h.find((p) => p.year >= 2013);
  const end = h[h.length - 1];
  if (!start || !end || end.year <= start.year || !start.price) return null;
  return ((end.price / start.price) ** (1 / (end.year - start.year)) - 1) * 100;
}

export function StreetProfile({ suburb, streets }: { suburb: string; streets: Street[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pick, setPick] = useState(streets[0]?.street ?? null);
  const shown = useMemo(() => streets.filter((s) => s.street.toLowerCase().includes(q.toLowerCase())), [streets, q]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const rows = shown.slice(page * PAGE, page * PAGE + PAGE);
  const sel = streets.find((s) => s.street === pick);
  const lastYear = sel?.history[sel.history.length - 1]?.year ?? 2026;

  const chart = sel
    ? [
        {
          name: `${sel.street} median`,
          color: "var(--brand)",
          points: [
            ...sel.history.map((p) => ({ date: `${p.year}-06-30`, value: p.price })),
            ...([
              [2, sel.target_2y],
              [4, sel.target_4y],
              [8, sel.target_8y],
            ] as const)
              .filter(([, v]) => v != null)
              .map(([n, v]) => ({ date: `${lastYear + n}-06-30`, value: v as number })),
          ],
        },
        { name: `${suburb} median`, color: "var(--accent)", points: sel.history.map((p) => ({ date: `${p.year}-06-30`, value: p.suburb_med })) },
      ]
    : [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder={`Search streets in ${suburb}...`}
          className="w-full max-w-[320px] rounded-xl border border-line bg-card px-3 py-2 text-[13.5px]"
        />
        <span className="text-[13px] text-slate">
          {shown.length} of {streets.length} streets
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[960px] text-[13px]">
          <thead className="bg-ink/[.03] text-[12px] text-faint">
            <tr>
              {["Street", "Current Price", "Past Growth/yr", "4yr Forecast/yr", "8yr Forecast/yr", "Confidence", "Houses", "Units", "Rent/wk", "Sales Turnover", "Rental Turnover", "Renters"].map((h, i) => (
                <th key={h} className={`px-2.5 py-2 font-medium ${i ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.street}
                onClick={() => setPick(s.street)}
                className={`cursor-pointer border-t border-line tabular-nums ${s.street === pick ? "bg-brand-wash" : "hover:bg-ink/[.03]"}`}
              >
                <td className="px-2.5 py-2 font-medium text-brand-deep">{s.street}</td>
                <td className="px-2.5 py-2 text-right font-semibold">{siteMoney(s.current_price, 1)}</td>
                <td className="px-2.5 py-2 text-right" title="Derived from the street's price history in the API, not served as a field">
                  {yr(pastGrowth(s.history))}*
                </td>
                <td className="px-2.5 py-2 text-right text-ok-deep">{yr(s.annual_4y)}</td>
                <td className="px-2.5 py-2 text-right text-ok-deep">{yr(s.annual_8y)}</td>
                <td className="px-2.5 py-2 text-right">
                  <span className="rounded bg-warn/15 px-1 text-[10px] font-semibold uppercase text-warn" title="Not in the API">
                    n/a
                  </span>
                </td>
                <td className="px-2.5 py-2 text-right">{s.houses_on_street ?? "—"}</td>
                <td className="px-2.5 py-2 text-right">{s.units_on_street ?? "—"}</td>
                <td className="px-2.5 py-2 text-right">{s.median_house_rent_week != null ? `$${Math.round(s.median_house_rent_week)}/wk` : "—"}</td>
                <td className="px-2.5 py-2 text-right">{years(s.sale_turnover)}</td>
                <td className="px-2.5 py-2 text-right">{years(s.rental_turnover)}</td>
                <td className="px-2.5 py-2 text-right">{s.renters_pct ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-[12.5px] text-slate">
        <span>
          Page {page + 1} of {pages} · * past growth derived from the street&apos;s price history; forecast confidence per street is not in the API
        </span>
        <span className="flex gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">
            ← Prev
          </button>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">
            Next →
          </button>
        </span>
      </div>
      {sel && (
        <div className="mt-5">
          <div className="mb-2 text-[13.5px]">
            <b>{sel.street} — Growth Time Series</b>{" "}
            <span className="text-slate">
              at {lastYear + 2}, {lastYear + 4}, {lastYear + 8} ({yr(sel.annual_4y)} → {yr(sel.annual_8y)})
            </span>
          </div>
          <LineChart series={chart} format={(n) => siteMoney(n, 1)} height={240} />
          <p className="mt-1 text-[12px] italic text-faint">Last three points = forecast. Earlier = reconstructed street price history.</p>
        </div>
      )}
    </div>
  );
}
