"use client";

import { ChoroplethMap, RAMPS } from "@/components/ChoroplethMap";
import { Pending } from "@/components/PageShell";
import { type Feature, type FeatureCollection, suburbPath } from "@/lib/api";
import { useApi } from "@/lib/api-store";

/** One colour: the suburb is the only shape with a value. */
const SOLID = [RAMPS.blue[3], RAMPS.blue[3]] as const;

/** The suburb outline with its neighbours around it, as on the site's hero map. */
export function HeroMap({ suburb }: { suburb: string }) {
  const boundary = useApi<{ geojson: Feature }>(suburbPath(suburb, "shapes/boundary"));
  const neighbours = useApi<{ geojson: FeatureCollection }>(suburbPath(suburb, "shapes/neighbours"));
  const b = boundary.data?.geojson;
  if (!b) return <Pending height={450} />;
  const outlines = (neighbours.data?.geojson.features ?? []).map((f) => ({
    id: String(f.properties.suburb),
    label: String(f.properties.suburb).replace(/\s*\(.*\)$/, ""),
    feature: f,
  }));
  return (
    <ChoroplethMap
      shapes={[{ ...b, properties: { id: suburb } }]}
      values={new Map([[suburb, 1]])}
      outlines={[...outlines, { id: suburb, feature: b }]}
      labelOutlines
      format={() => suburb}
      ramp={SOLID}
      hint={`${suburb}, outlined among its neighbours`}
      legend=""
      caption={`${suburb} and its neighbours`}
      maxHeight={450}
      showCodes={false}
      hideLegend
      opacity={0.35}
    />
  );
}
