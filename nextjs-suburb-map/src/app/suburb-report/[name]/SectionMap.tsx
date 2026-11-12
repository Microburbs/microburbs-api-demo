"use client";

import { useState } from "react";
import { ChoroplethMap, RAMPS } from "@/components/ChoroplethMap";
import { Pending } from "@/components/PageShell";
import { Choices } from "@/components/Pickers";
import { suburbPath } from "@/lib/api";
import { useApi } from "@/lib/api-store";
import { useSuburbShapes } from "@/lib/area";
import { int, money, perWeek, pctPoints } from "@/lib/format";

/**
 * A section's block-by-block map (the site's right-hand map), loaded in the
 * browser through this app's /api/mb route. Layers are plain data so server
 * sections can pass them in:
 *
 *   <SectionMap suburb={name} layers={[{ key: "price", label: "Median sale price",
 *     tail: "market/median-price-map", field: "median_price", format: "money", ramp: "blue" }]} />
 *
 * `field` is read from each row of `microburbs` / `mbs` (joined on `mb`), or
 * from the `mesh_blocks` code → value object. Dotted paths ("scores.family") work.
 */
export type MapLayer = {
  key: string;
  label: string;
  tail: string;
  field: string;
  format: "money" | "perWeek" | "pct" | "pct100" | "int" | "score" | "years";
  ramp: keyof typeof RAMPS;
  legend?: string;
};

const FORMATS: Record<MapLayer["format"], (n: number) => string> = {
  money,
  perWeek,
  pct: (n) => pctPoints(n, 1),
  pct100: (n) => pctPoints(n * 100, 1),
  int,
  score: (n) => `${Math.round(n)} / 100`,
  years: (n) => String(Math.round(n)),
};

type Row = Record<string, unknown>;
type Body = { microburbs?: Row[]; mbs?: Row[]; mesh_blocks?: Record<string, number> | Row[] };

function dig(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Row)[k] : undefined), row);
}

export function SectionMap({ suburb, layers, height = 520 }: { suburb: string; layers: MapLayer[]; height?: number }) {
  const [key, setKey] = useState(layers[0]?.key);
  const layer = layers.find((l) => l.key === key) ?? layers[0];
  const { shapes, boundary, loading } = useSuburbShapes(suburb);
  const body = useApi<Body>(layer ? suburbPath(suburb, layer.tail) : null);

  const values = new Map<string, number>();
  const labels = new Map<string, string>();
  const b = body.data;
  if (b && layer) {
    if (b.mesh_blocks && !Array.isArray(b.mesh_blocks)) {
      for (const [mb, v] of Object.entries(b.mesh_blocks)) if (typeof v === "number") values.set(mb, v);
    }
    const rows = [...(b.microburbs ?? []), ...(b.mbs ?? []), ...(Array.isArray(b.mesh_blocks) ? b.mesh_blocks : [])];
    for (const r of rows) {
      const v = dig(r, layer.field);
      const mb = String(r.mb ?? r.mb_code ?? r.mb_code21 ?? "");
      if (mb && typeof v === "number" && Number.isFinite(v)) values.set(mb, v);
      if (mb && typeof r.street === "string") labels.set(mb, r.street);
    }
  }

  return (
    <div className="rounded-[22px] border border-line bg-card p-3 shadow-card">
      {layers.length > 1 && (
        <div className="mb-2">
          <Choices label="Map layer" size="sm" value={layer.key} onChange={setKey} options={layers.map((l) => ({ value: l.key, label: l.label }))} />
        </div>
      )}
      {loading || !shapes || !layer ? (
        <Pending height={height} />
      ) : (
        <ChoroplethMap
          shapes={shapes.features}
          outlines={boundary ? [{ id: suburb, feature: boundary }] : []}
          values={values}
          labels={labels}
          format={FORMATS[layer.format]}
          ramp={RAMPS[layer.ramp]}
          legend={layer.legend ?? layer.label}
          caption={`${layer.label} per microburb in ${suburb}`}
          maxHeight={height}
          noDataLabel="No figure for the block"
        />
      )}
    </div>
  );
}
