/**
 * Look-alike building blocks for the website's suburb report, rendered on the
 * server. Colours come from the demo's theme tokens so dark and light both work.
 *
 * The one new idea is <NotInApi>: wherever the website shows something the API
 * does not serve, the clone renders this box in the same spot. That is the gap,
 * made visible. `planned` names the unreleased endpoint that will close it.
 */

import { ServerCalls } from "@/lib/api-store";
import type { ApiResult } from "@/lib/server/microburbs";

/** White card with the report's soft border, like every block on the site. */
export function ReportCard({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-44 rounded-[22px] border border-line bg-card p-5 shadow-card sm:p-7 ${className}`}>
      {children}
    </section>
  );
}

/** "Market Insights, Belmont North" with an icon and a one-line description. */
export function SectionTitle({ icon, title, sub }: { icon: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-2.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">
        <span aria-hidden className="text-[22px] text-brand">
          {icon}
        </span>
        {title}
      </h2>
      {sub && <p className="mt-1.5 text-[14px] leading-[1.5] text-slate">{sub}</p>}
    </div>
  );
}

/** A smaller heading inside a section ("Street Profile", "Figures by bedroom"). */
export function SubTitle({ title, sub }: { title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
      {sub && <p className="mt-0.5 text-[13px] text-slate">{sub}</p>}
    </div>
  );
}

export type Tone = "good" | "bad" | "warn" | "info" | "neutral";
const TONE: Record<Tone, string> = {
  good: "bg-ok/12 text-ok-deep border-ok/30",
  bad: "bg-bad/12 text-bad border-bad/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  info: "bg-brand-wash text-brand-deep border-brand/25",
  neutral: "bg-ink/[.05] text-slate border-line",
};

/** The small uppercase pill at the right of a row: MIXED, LOW, WARNING, SAFE. */
export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.06em] ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** The two-line badge at the left of a signal row: "Top 39%" over "Nationally". */
export function Badge({ top, bottom, tone = "neutral" }: { top: React.ReactNode; bottom?: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex w-[84px] shrink-0 flex-col items-center rounded-lg border px-1.5 py-1 text-center leading-tight ${TONE[tone]}`}>
      <span className="text-[12px] font-semibold">{top}</span>
      {bottom && <span className="text-[9.5px] opacity-80">{bottom}</span>}
    </span>
  );
}

/**
 * One expandable row, the shape of every list on the site (Market Signals,
 * Risks, Development Layers, Livability, Demographics). Native <details>, so
 * no client JS.
 */
export function SignalRow({
  icon,
  badge,
  title,
  desc,
  chip,
  children,
}: {
  icon?: string;
  badge?: React.ReactNode;
  title: React.ReactNode;
  desc?: React.ReactNode;
  chip?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const head = (
    <div className="flex items-center gap-3 px-3.5 py-3">
      {icon && (
        <span aria-hidden className="w-6 shrink-0 text-center text-[17px]">
          {icon}
        </span>
      )}
      {badge}
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold">{title}</div>
        {desc && <div className="mt-0.5 text-[13px] leading-[1.45] text-slate">{desc}</div>}
      </div>
      {chip}
      {children && <span className="shrink-0 text-faint transition group-open:rotate-90">›</span>}
    </div>
  );
  if (!children) return <div className="rounded-xl border border-line bg-card">{head}</div>;
  return (
    <details className="group rounded-xl border border-line bg-card open:border-brand/40">
      <summary className="cursor-pointer list-none">{head}</summary>
      <div className="border-t border-line px-4 py-3 text-[13.5px] leading-[1.55] text-slate">{children}</div>
    </details>
  );
}

/** A boxed figure: "$1.05M" over "HOUSES", optional change above it. */
export function StatTile({
  value,
  label,
  delta,
  deltaTone,
  side,
  className = "",
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: "up" | "down";
  /** A small figure at the right, e.g. "+1.11% growth/yr". */
  side?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line bg-card px-4 py-3.5 text-center ${className}`}>
      {delta && (
        <div className={`text-[12px] font-semibold ${deltaTone === "down" ? "text-bad" : "text-ok-deep"}`}>
          {deltaTone === "down" ? "▼" : "▲"} {delta}
        </div>
      )}
      <div className="text-[24px] font-semibold leading-tight tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[.08em] text-faint">{label}</div>
      {side && <div className="mt-1 text-[11.5px] text-slate">{side}</div>}
    </div>
  );
}

/**
 * The gap, made visible: the website shows something here and the API does not
 * serve it. `planned` is the unreleased endpoint that will close the gap.
 * `differs` marks a figure the API serves with a different value or meaning.
 */
export function NotInApi({
  what,
  planned,
  note,
  compact,
}: {
  what: React.ReactNode;
  planned?: string;
  note?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed border-warn/50 bg-warn/[.06] text-[13px] leading-[1.45] ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      data-gap="not-in-api"
    >
      <span className="mr-2 inline-flex rounded bg-warn/15 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-warn">
        Not in the API
      </span>
      <span className="font-medium text-ink">{what}</span>
      {planned && (
        <span className="ml-1.5 text-slate">
          · coming in <code className="font-mono text-[11.5px]">{planned}</code>
        </span>
      )}
      {note && <div className="mt-1 text-slate">{note}</div>}
    </div>
  );
}

/** Marks a figure the API serves but with a different value or definition than the website. */
export function Differs({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 cursor-help rounded bg-brand-wash px-1 text-[10px] font-semibold uppercase tracking-[.06em] text-brand-deep" title={String(children)}>
      differs
    </span>
  );
}

/** A plain table in the site's style. */
export function Table({ head, rows, align }: { head: React.ReactNode[]; rows: React.ReactNode[][]; align?: ("l" | "r")[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-[12px] font-medium text-faint">
            {head.map((h, i) => (
              <th key={i} className={`px-2 py-2 font-medium ${align?.[i] === "r" ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/70 last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`px-2 py-2 tabular-nums ${align?.[j] === "r" ? "text-right" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Hand the calls a section made to the API calls panel. */
export function Calls({ results }: { results: ApiResult<unknown>[] }) {
  return <ServerCalls calls={results.map((r) => r.call)} />;
}

/** Left column of rows, map on the right, as the site lays out its lower sections. */
export function WithMap({ children, map }: { children: React.ReactNode; map: React.ReactNode }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">{children}</div>
      <div className="min-w-0 xl:sticky xl:top-28 xl:self-start">{map}</div>
    </div>
  );
}
