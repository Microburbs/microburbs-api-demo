"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/LineChart";
import type { Point } from "@/lib/api";
import { siteMoney, trim } from "./fmt";

type HU = { house: Point[]; unit: Point[] };
export type SalesSeries = { price: HU; volume: HU; rent: HU; yield: HU; vacancy: HU };

const METRICS = [
  { key: "price", label: "Median Sale Price", fmt: (n: number) => siteMoney(n) },
  { key: "volume", label: "Sales Volume", fmt: (n: number) => String(Math.round(n)) },
  { key: "rent", label: "Median Rent", fmt: (n: number) => `$${Math.round(n)}` },
  { key: "yield", label: "Gross Yield", fmt: (n: number) => `${trim(n * 100)}%` },
  { key: "vacancy", label: "Vacancy Rate", fmt: (n: number) => `${trim(n * 100)}%` },
] as const;
const PERIODS = [
  { key: "3M", months: 3 },
  { key: "1Y", months: 12 },
  { key: "3Y", months: 36 },
  { key: "5Y", months: 60 },
  { key: "10Y", months: 120 },
  { key: "All", months: 0 },
] as const;

function Pills<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-ink/[.05] p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${value === o.key ? "bg-card text-ink shadow-card" : "text-slate hover:text-ink"}`}
        >
          {o.label ?? o.key}
        </button>
      ))}
    </div>
  );
}

/** "Sales Data — {suburb}": one metric at a time, houses or units, over a chosen window, in $ or % change. */
export function SalesChart({ suburb, series }: { suburb: string; series: SalesSeries }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("price");
  const [dw, setDw] = useState<"house" | "unit">("house");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("1Y");
  const [mode, setMode] = useState<"$" | "%">("$");
  const m = METRICS.find((x) => x.key === metric)!;

  const points = useMemo(() => {
    const all = series[metric][dw] ?? [];
    const months = PERIODS.find((p) => p.key === period)!.months;
    const last = all.length ? Date.parse(all[all.length - 1].date) : 0;
    const from = months ? last - months * 30.44 * 864e5 : -Infinity;
    const win = all.filter((p) => Date.parse(p.date) >= from);
    if (mode === "$" || !win.length) return win;
    const base = win[0].value;
    return win.map((p) => ({ date: p.date, value: base ? p.value / base - 1 : 0 }));
  }, [series, metric, dw, period, mode]);

  const fmt = mode === "%" ? (n: number) => `${n >= 0 ? "+" : ""}${trim(n * 100, 1)}%` : m.fmt;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold">Sales Data — {suburb}</h3>
        <div className="flex flex-wrap gap-2">
          <Pills value={mode} onChange={setMode} options={[{ key: "$" }, { key: "%" }]} />
          <Pills value={dw} onChange={setDw} options={[{ key: "house", label: "Houses" }, { key: "unit", label: "Units" }]} />
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setMetric(x.key)}
              className={`rounded-lg border px-3 py-1 text-[12.5px] ${metric === x.key ? "border-brand bg-brand-wash text-brand-deep" : "border-line text-slate hover:text-ink"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <Pills value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ key: p.key }))} />
      </div>
      {points.length > 1 ? (
        <LineChart series={[{ name: `${suburb} ${dw === "house" ? "houses" : "units"}`, color: "var(--brand)", points }]} format={fmt} height={260} />
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13.5px] text-slate">
          The API has no {m.label.toLowerCase()} series for {dw === "house" ? "houses" : "units"} here.
        </p>
      )}
    </div>
  );
}
