import { shortName } from "@/lib/api";
import { money } from "@/lib/format";
import { type Json, get } from "../load";
import { Calls, NotInApi, ReportCard, SectionTitle } from "../ui";

/*
 * Similar Suburbs: three cards (outline map, median house and unit price, a
 * one-line comparison, keyword tags, a link).
 *
 * The API has /similar, but today it answers "no_data" for every sample suburb
 * (the site shows cards for Bondi). The neighbouring suburbs from
 * hero/neighbours are shown underneath as the nearest thing the API serves.
 */
export default async function SimilarSection({ name }: { name: string }) {
  const [similar, neighbours] = await Promise.all([get<Json>(name, "similar"), get<Json>(name, "hero/neighbours")]);
  const short = shortName(name);
  const cards: Json[] = Array.isArray(similar.data) ? similar.data.slice(0, 3) : [];

  return (
    <ReportCard id="similar">
      <Calls results={[similar, neighbours]} />
      <SectionTitle icon="🧭" title="Similar Suburbs" sub={`Explore alternatives to ${short} with similar lifestyle features`} />
      {cards.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.area_name} className="flex flex-col gap-2 rounded-2xl border border-line p-4">
              <h3 className="text-[19px] font-bold">{shortName(c.area_name)}</h3>
              <div className="flex gap-4 text-[13px]">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-faint">Houses</div>
                  <div className="font-bold">{money(c.price?.house ?? null)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-faint">Units</div>
                  <div className="font-bold">{money(c.price?.unit ?? null)}</div>
                </div>
              </div>
              {c.summary && <p className="text-[13.5px] text-slate">{c.summary}</p>}
              {c.keywords && (
                <div className="flex flex-wrap gap-1.5">
                  {String(c.keywords)
                    .split(/[,;]/)
                    .map((k) => k.trim())
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((k) => (
                      <span key={k} className="rounded-lg bg-brand-wash px-2 py-1 text-[11px] font-medium text-brand-deep">
                        {k}
                      </span>
                    ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <NotInApi
          what="Similar-suburb cards: outline map, median house and unit price, a comparison line and keyword tags"
          note={`similar answered “${similar.message ?? "no data"}”. The website shows three cards here when it has them.`}
        />
      )}

      {neighbours.data?.neighbours?.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[12px] font-medium uppercase tracking-[.08em] text-faint">Neighbouring suburbs (what the API does serve)</div>
          <div className="flex flex-wrap gap-2">
            {neighbours.data.neighbours.slice(0, 8).map((n: Json) => (
              <span key={n.sal} className="rounded-full border border-line px-3 py-1 text-[13px]">
                {shortName(n.sal)} <span className="text-faint">{n.dist_km} km</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </ReportCard>
  );
}
