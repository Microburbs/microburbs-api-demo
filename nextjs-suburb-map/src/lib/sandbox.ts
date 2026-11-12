/**
 * What this demo is allowed to ask the API for.
 *
 * The demo runs on the public sandbox key (`Bearer test`). That key answers for
 * nine sample suburbs, one per state and territory, and eight sample
 * properties. Everything else answers 403. The lists below match the API's own
 * sandbox lists, so the UI only ever offers things that answer, and the server
 * (src/lib/server/microburbs.ts) refuses anything outside them before it
 * reaches the API.
 *
 * With your own key from https://www.microburbs.com.au/developers/keys every
 * suburb and address in Australia answers; widen these lists to match.
 */
import type { SuburbListItem } from "./api";

/** Official suburb (SAL) names: the suffix is part of the name ("St Kilda (Vic.)"). */
export const SANDBOX_SUBURBS: SuburbListItem[] = [
  { suburb: "Bondi", state: "NSW" },
  { suburb: "Belmont North", state: "NSW" },
  { suburb: "St Kilda (Vic.)", state: "VIC" },
  { suburb: "Fortitude Valley", state: "QLD" },
  { suburb: "Subiaco", state: "WA" },
  { suburb: "Unley", state: "SA" },
  { suburb: "Sandy Bay", state: "TAS" },
  { suburb: "Kambah", state: "ACT" },
  { suburb: "Nightcliff", state: "NT" },
];

export const SANDBOX_SUBURB_NAMES = SANDBOX_SUBURBS.map((s) => s.suburb);

/** The sample properties, one per state and territory except a second NSW one. */
export const SAMPLE_PROPERTIES = [
  { gnaf: "GANSW704074813", address: "27 Arlington Street", suburb: "Belmont North" },
  { gnaf: "GAVIC419929404", address: "12A Chaucer Street", suburb: "St Kilda (Vic.)" },
  { gnaf: "GAQLD162849753", address: "305/41 Robertson Street", suburb: "Fortitude Valley" },
  { gnaf: "GAWA_146662014", address: "36 Olive Street", suburb: "Subiaco" },
  { gnaf: "GASA_422266490", address: "53 Marion Street", suburb: "Unley" },
  { gnaf: "GATAS702292990", address: "85 Lord Street", suburb: "Sandy Bay" },
  { gnaf: "GAACT714845944", address: "9 McDowall Place", suburb: "Kambah" },
  { gnaf: "GANT_703835649", address: "16 Jacksonia Circuit", suburb: "Nightcliff" },
];

export const SAMPLE_GNAFS = SAMPLE_PROPERTIES.map((p) => p.gnaf);

export const isSandboxSuburb = (name: string | null | undefined) => !!name && SANDBOX_SUBURB_NAMES.includes(name);
export const isSampleProperty = (gnaf: string | null | undefined) => !!gnaf && SAMPLE_GNAFS.includes(gnaf);

export const KEYS_URL = "https://www.microburbs.com.au/developers/keys";

/** Shown wherever the demo stops at the edge of the sandbox. */
export const SANDBOX_NOTE = `The demo runs on the public sandbox key, which covers nine sample suburbs and eight sample addresses. Get a key at ${KEYS_URL} for every suburb and address in Australia.`;

/**
 * Is `/v1/...` inside the sandbox? Mirrors the API's own rule: a path under a
 * sample suburb, a sample property or a sample suburb's area statistics, plus
 * the free suburb-name search. Anything else is refused, including paths this
 * demo never makes.
 */
export function sandboxAllows(pathAndQuery: string): boolean {
  const path = pathAndQuery.split("?")[0];
  const seg = path.split("/").slice(1).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return "\u0000"; // undecodable: never matches
    }
  });
  if (seg[0] !== "v1") return false;
  // "." and ".." would be resolved away by the URL parser after this check.
  if (seg.some((s) => s === "" || s === "." || s === "..")) return false;
  if (seg[1] === "me" && seg.length === 2) return true;
  // Suburb-name search is free and works nationwide on the sandbox key. Picking
  // a result outside the sandbox goes to /not-in-demo, never to its data.
  if (seg[1] === "geocode" && seg[2] === "suburb" && seg.length === 3) return true;
  if (seg[1] === "suburbs" && seg.length >= 4) return isSandboxSuburb(seg[2]);
  if (seg[1] === "properties" && seg.length >= 4) return isSampleProperty(seg[2]);
  if (seg[1] === "area-stats" && seg.length >= 5) return isSandboxSuburb(seg[3]);
  return false;
}

/** "Bondi" → "NSW". Empty for a suburb outside the sandbox. */
export const stateOf = (name: string | null | undefined) =>
  SANDBOX_SUBURBS.find((s) => s.suburb === name || s.suburb.replace(/\s*\(.*\)$/, "") === name)?.state ?? "";

export const STATE_NAMES: Record<string, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
};

/** Where a suburb link goes: its report inside the sandbox, the friendly stop page outside it. */
export const suburbOrStopHref = (name: string) =>
  isSandboxSuburb(name)
    ? `/suburbs/${encodeURIComponent(name)}`
    : `/not-in-demo?suburb=${encodeURIComponent(name)}`;
