import "server-only";
import { cache } from "react";
import { suburbPath } from "@/lib/api";
import { type ApiResult, api } from "@/lib/server/microburbs";

/**
 * One suburb endpoint, fetched once per request however many sections ask for
 * it (React `cache`). Every value on this report comes through here, so the
 * API calls panel lists exactly what the page used.
 *
 *   const r = await get<HeroSummary>(name, "hero/summary");
 */
const getRaw = cache((name: string, tail: string) => api<unknown>(suburbPath(name, tail)));

export function get<T>(name: string, tail: string): Promise<ApiResult<T>> {
  return getRaw(name, tail) as Promise<ApiResult<T>>;
}

/** Fetch several tails in parallel; returns results in the same order. */
export async function getAll(name: string, tails: string[]) {
  return Promise.all(tails.map((t) => get<unknown>(name, t)));
}

/** Loose JSON accessor: dig into an untyped API body without a type for every field. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;
