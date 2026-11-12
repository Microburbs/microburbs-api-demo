/**
 * Paths, types and copyable snippets for the Microburbs API.
 * Safe to import anywhere: there is no key in here. The browser calls this
 * app's own /api/mb/... route, which adds the key on the server.
 */

/** Shown in the request inspector until the server tells us the real base. */
export const DEFAULT_API_BASE = "https://api.microburbs.com.au";
export const DOCS_URL = "https://www.microburbs.com.au/developers/api-docs";
export { KEYS_URL } from "./sandbox";

/**
 * The key every snippet shows: the public sandbox key, which the API docs
 * publish too. It works as is for the sample suburbs and addresses; swap in
 * your own key for the rest of Australia.
 */
export const KEY_PLACEHOLDER = "test";

/** The documented sample property and suburb. */
export const EXAMPLE_PROPERTY = { gnaf: "GANSW704074813", address: "27 Arlington Street, Belmont North" };
export const EXAMPLE_SUBURB = "Bondi";

/** `/v1/suburbs/{name}/{tail}`, with the name encoded ("St Kilda (Vic.)" → "St%20Kilda%20(Vic.)"). */
export const suburbPath = (name: string, tail: string) => `/v1/suburbs/${encodeURIComponent(name)}/${tail}`;
export const propertyPath = (gnaf: string, tail: string) => `/v1/properties/${encodeURIComponent(gnaf)}/${tail}`;

/** App routes for a suburb and a property. */
export const suburbHref = (name: string) => `/suburbs/${encodeURIComponent(name)}`;
export const propertyHref = (gnaf: string) => `/property/${encodeURIComponent(gnaf)}`;

/** "St Kilda (Vic.)" → "St Kilda". */
export const shortName = (name: string) => name.replace(/\s*\(.*\)$/, "");

/* -------------------------------------------------------------- *
 * The same request as curl, JavaScript and Python, key as placeholder.
 * -------------------------------------------------------------- */

export function asCurl(url: string) {
  return `curl "${url}" \\\n  -H "Authorization: Bearer ${KEY_PLACEHOLDER}"`;
}

export function asFetch(url: string) {
  return `const res = await fetch("${url}", {
  headers: { Authorization: \`Bearer \${process.env.MICROBURBS_API_KEY}\` },
});
const { data } = await res.json(); // data is null when there is no figure`;
}

export function asPython(url: string) {
  return `import os, requests

res = requests.get(
    "${url}",
    headers={"Authorization": f"Bearer {os.environ['MICROBURBS_API_KEY']}"},
)
data = res.json()["data"]  # None when there is no figure`;
}

/* -------------------------------------------------------------- *
 * Response shapes. Only the fields the app reads are typed.
 * -------------------------------------------------------------- */

export type HouseUnit<T> = { house: T | null; unit: T | null };
export type Point = { date: string; value: number };

export type Geometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type Feature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: Geometry | null;
};

export type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

export type SuburbListItem = { suburb: string; state: string };

export type SuburbMatch = {
  area_name: string;
  area_level: string;
  information?: { poa?: string; sa2?: string; lga?: string };
};

export type AddressMatch = {
  id: string;
  name: string;
  display_name: string;
  property_type?: string | null;
};

/** decodeURIComponent that never throws, for showing paths to people. */
export function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
