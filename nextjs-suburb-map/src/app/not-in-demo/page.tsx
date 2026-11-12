import type { Metadata } from "next";
import Link from "next/link";
import { shortName, suburbHref } from "@/lib/api";
import { KEYS_URL, SAMPLE_PROPERTIES, SANDBOX_SUBURBS, STATE_NAMES, isSandboxSuburb } from "@/lib/sandbox";

export const metadata: Metadata = { title: "Not in the demo", robots: { index: false } };

type Search = { suburb?: string };

/**
 * Where a suburb outside the sandbox lands. The search box finds every suburb
 * in Australia, but the demo's key only answers for the nine sample ones, so
 * instead of a 403 the visitor gets this page and a way back in.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const asked = typeof sp.suburb === "string" ? sp.suburb.slice(0, 80) : "";
  const label = asked && !isSandboxSuburb(asked) ? asked : "That suburb";
  return (
    <main className="mx-auto max-w-[760px] px-4 py-20 sm:px-6">
      <p className="text-[13px] font-medium uppercase tracking-[.12em] text-brand-deep">This is a demo</p>
      <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">
        {label} isn&apos;t available here
      </h1>
      <p className="mt-4 text-[16.5px] leading-[1.6] text-slate">
        The demo runs on the public sandbox key, which answers for nine sample suburbs, one per state and territory.
        Try one of these:
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-3">
        {SANDBOX_SUBURBS.map((s) => (
          <li key={s.suburb}>
            <Link
              href={suburbHref(s.suburb)}
              className="flex items-baseline justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 shadow-card transition hover:border-brand/50"
            >
              <span className="text-[15.5px] font-medium">{shortName(s.suburb)}</span>
              <span className="text-[12.5px] text-faint" title={STATE_NAMES[s.state]}>
                {s.state}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 text-[17px] font-semibold">Or a sample property</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SAMPLE_PROPERTIES.map((p) => (
          <li key={p.gnaf}>
            <Link
              href={`/property?gnaf=${encodeURIComponent(p.gnaf)}`}
              className="inline-block rounded-full border border-line px-3 py-1.5 text-[13.5px] text-slate hover:border-brand hover:text-ink"
            >
              {p.address}, {shortName(p.suburb)}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-[14px] text-slate">
        Need {asked && !isSandboxSuburb(asked) ? shortName(asked) : "another suburb"}?{" "}
        <a href={KEYS_URL} className="font-medium text-brand-deep underline-offset-2 hover:underline">
          Get a key for the whole country
        </a>
        .
      </p>
    </main>
  );
}
