import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { SectionGhost } from "@/components/report/ui";
import { safeDecode, shortName } from "@/lib/api";
import { SANDBOX_SUBURB_NAMES } from "@/lib/sandbox";
import Demographics from "./sections/Demographics";
import Development from "./sections/Development";
import Hero from "./sections/Hero";
import Lifestyle from "./sections/Lifestyle";
import MarketInsights from "./sections/MarketInsights";
import MarketSignals from "./sections/MarketSignals";
import Properties from "./sections/Properties";
import Risks from "./sections/Risks";
import Similar from "./sections/Similar";

/*
 * A clone of the suburb report on microburbs.com.au, built only from the
 * public API. Same sections in the same order as the website. Wherever the
 * website shows something the API does not serve, a "Not in the API" box sits
 * in its place.
 */

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ name: string }> };

async function resolve(params: Params["params"]) {
  const { name: raw } = await params;
  const name = safeDecode(raw);
  return SANDBOX_SUBURB_NAMES.includes(name) ? name : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const name = await resolve(params);
  return name
    ? {
        title: `${shortName(name)} suburb report (API clone)`,
        alternates: { canonical: `/suburb-report/${encodeURIComponent(name)}` },
      }
    : { title: "Suburb not found" };
}

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "market", label: "Market" },
  { id: "risks", label: "Risks" },
  { id: "development", label: "Development" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "demographics", label: "Demographics" },
  { id: "properties", label: "Properties" },
];

export default async function Page({ params }: Params) {
  const name = await resolve(params);
  if (!name) {
    const { name: raw } = await params;
    const asked = safeDecode(raw).trim();
    if (asked) redirect(`/not-in-demo?suburb=${encodeURIComponent(asked)}`);
    notFound();
  }

  return (
    <PageShell
      source="suburb-report/[name]/page.tsx"
      eyebrow={
        <Link href="/suburbs" className="hover:text-ink">
          Suburb report · API clone
        </Link>
      }
      title={null}
      intro={null}
    >
      <p className="mb-4 rounded-xl border border-line bg-card px-4 py-2.5 text-[13.5px] text-slate">
        The suburb report from microburbs.com.au, rebuilt from the public API alone. Every figure comes from a call in the
        API calls panel. Dashed{" "}
        <span className="rounded bg-warn/15 px-1 text-[11px] font-semibold uppercase text-warn">Not in the API</span> boxes
        mark what the website shows that the API does not serve yet.
      </p>
      <nav className="sticky top-16 z-20 mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-card/95 p-1.5 shadow-card backdrop-blur">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} className="shrink-0 rounded-xl px-3.5 py-1.5 text-[13.5px] font-medium text-slate hover:bg-brand-wash hover:text-brand-deep">
            {n.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6">
        <Suspense fallback={<SectionGhost />}>
          <Hero name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <MarketInsights name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <MarketSignals name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <Risks name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <Development name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <Lifestyle name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <Demographics name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <Properties name={name} />
        </Suspense>
        <Suspense fallback={<SectionGhost />}>
          <Similar name={name} />
        </Suspense>
      </div>
    </PageShell>
  );
}
