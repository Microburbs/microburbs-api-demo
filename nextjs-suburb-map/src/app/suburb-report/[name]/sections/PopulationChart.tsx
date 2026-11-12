"use client";

import { LineChart, type Series } from "@/components/LineChart";
import { int } from "@/lib/format";

/**
 * Population over time: the suburb, and its council area with the forward
 * projection. The site draws both on one chart with two axes; the two differ by
 * ~35x, so here they are two small charts sharing the same years.
 */
export function PopulationChart({ suburb, lga }: { suburb: Series[]; lga: Series[] }) {
  return (
    <div className="grid gap-4">
      {[suburb, lga].map((series, i) => (
        <div key={i}>
          <div className="mb-1.5 flex flex-wrap gap-3 text-[12px] text-slate">
            {series.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
          <LineChart series={series} format={int} height={150} />
        </div>
      ))}
    </div>
  );
}
