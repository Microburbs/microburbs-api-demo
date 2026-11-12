"use client";

import { type FeatureCollection, type Feature, suburbPath } from "./api";
import { useApi } from "./api-store";
import { SANDBOX_SUBURBS, SANDBOX_SUBURB_NAMES, SAMPLE_PROPERTIES } from "./sandbox";

/**
 * The suburbs the demo covers: the sandbox key's nine, with the exact names the
 * /v1/suburbs/{name}/... routes expect ("St Kilda (Vic.)", not "St Kilda").
 * With your own key, GET /v1/suburbs/list?q= finds any suburb in Australia.
 */
export function useSuburbList() {
  return { data: SANDBOX_SUBURBS, names: SANDBOX_SUBURB_NAMES, loading: false, error: null as string | null, call: undefined };
}

/** The sample addresses, so each demo opens on something real. */
export const EXAMPLE_PROPERTIES = SAMPLE_PROPERTIES;

type MeshBlocks = { count: number; geojson: FeatureCollection };
type Boundary = { geojson: Feature };

/** A suburb's mesh-block polygons and its outline, for any per-block map. */
export function useSuburbShapes(suburb: string | null) {
  const blocks = useApi<MeshBlocks>(suburb ? suburbPath(suburb, "shapes/mesh-blocks") : null);
  const boundary = useApi<Boundary>(suburb ? suburbPath(suburb, "shapes/boundary") : null);
  return {
    shapes: blocks.data?.geojson ?? null,
    boundary: boundary.data?.geojson ?? null,
    calls: [blocks.call, boundary.call],
    loading: blocks.loading,
    error: blocks.error,
  };
}
