"use client";

import { useMemo, useState } from "react";
import { ChoroplethMap, type Marker, RAMPS } from "@/components/ChoroplethMap";
import { useSuburbShapes } from "@/lib/area";
import { date, moneyFull } from "@/lib/format";

export type PropRow = {
  id: string;
  address: string;
  type: string | null;
  beds: number | null;
  baths: number | null;
  price: number | null;
  /** For sale: the asking text as the agent wrote it. */
  priceText?: string | null;
  date: string | null;
  lat: number | null;
  lng: number | null;
};

const PAGE = 7;
const NO_VALUES = new Map<string, number>();
const fmtNone = () => "";

/**
 * The site's Properties panel: Recent sales / For sale tabs, a paged table and
 * a map of the rows. The yield column and its thumbs are kept as a visible gap.
 */
export function PropertiesPanel({ suburb, sold, forSale }: { suburb: string; sold: PropRow[]; forSale: PropRow[] }) {
  const [tab, setTab] = useState<"sold" | "sale">("sold");
  const [page, setPage] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const { boundary } = useSuburbShapes(suburb);
  const rows = tab === "sold" ? sold : forSale;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  const markers: Marker[] = useMemo(
    () =>
      rows
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({
          id: r.id,
          lat: r.lat!,
          lng: r.lng!,
          label: `${r.address} · ${r.priceText ?? moneyFull(r.price)}`,
          tone: r.id === hover ? "focus" : "dot",
          color: r.id === hover ? undefined : tab === "sold" ? "#3b82f6" : "#10b981",
        })),
    [rows, hover, tab],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="mb-3 flex gap-4 border-b border-line text-[14px]">
          {(
            [
              ["sold", "Recent sales", sold.length],
              ["sale", "For sale", forSale.length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setPage(0);
              }}
              className={`-mb-px border-b-2 px-1 pb-2 font-medium ${tab === k ? "border-brand text-ink" : "border-transparent text-slate"}`}
            >
              {label}{" "}
              <span className={`ml-1 rounded-full px-1.5 text-[11px] ${k === "sold" ? "bg-brand-wash text-brand-deep" : "bg-ok/12 text-ok-deep"}`}>{n}</span>
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-[13.5px]">
            <thead className="bg-ink/[.03] text-[11px] font-semibold uppercase tracking-[.06em] text-faint">
              <tr>
                <th className="px-3 py-2 text-left">Address</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-right">Bd</th>
                <th className="px-2 py-2 text-right">Ba</th>
                <th className="px-2 py-2 text-right">{tab === "sold" ? "Sale price" : "Asking"}</th>
                <th className="px-3 py-2 text-right">
                  Yield <span className="ml-0.5 rounded bg-warn/15 px-1 text-[9.5px] text-warn">n/a</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover(null)}
                  className={`border-t border-line/70 ${hover === r.id ? "bg-brand-wash" : ""}`}
                >
                  <td className="px-3 py-2">
                    {r.address}
                    <div className="text-[11.5px] text-faint">{date(r.date)}</div>
                  </td>
                  <td className="px-2 py-2">
                    {r.type && <span className="rounded-md bg-brand-wash px-1.5 py-0.5 text-[11.5px] text-brand-deep">{r.type}</span>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.beds ?? "–"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.baths ?? "–"}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{r.priceText ?? moneyFull(r.price)}</td>
                  <td className="px-3 py-2 text-right text-faint">–</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between text-[12.5px] text-slate">
          <span>
            {rows.length ? page * PAGE + 1 : 0}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}
          </span>
          <span className="flex items-center gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-line px-2 py-0.5 disabled:opacity-40">
              ‹ Prev
            </button>
            Page {page + 1} of {pages}
            <button
              type="button"
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded-md border border-line px-2 py-0.5 disabled:opacity-40"
            >
              Next ›
            </button>
          </span>
        </div>
      </div>
      <div className="min-w-0 xl:sticky xl:top-28 xl:self-start">
        <ChoroplethMap
          shapes={[]}
          outlines={boundary ? [{ id: suburb, feature: boundary }] : []}
          values={NO_VALUES}
          markers={markers}
          format={fmtNone}
          ramp={RAMPS.blue}
          legend=""
          caption={`${tab === "sold" ? "Recent sales" : "For sale"} in ${suburb}`}
          hint={`${tab === "sold" ? "Blue dots are recent sales" : "Green dots are for sale"}. Hover a row to find it.`}
          maxHeight={480}
          hideLegend
        />
      </div>
    </div>
  );
}
