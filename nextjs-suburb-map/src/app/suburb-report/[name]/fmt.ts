/** The website's number style: "$1.05M", "$924k", "0.41%". */

const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** "$1.05M" (dp=2) or "$1.1M" (dp=1); "$924k" under a million. */
export function siteMoney(n: unknown, dp = 2): string {
  if (!ok(n) || n <= 0) return "—";
  if (n >= 1e6) return `$${String(+(n / 1e6).toFixed(dp))}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
}

/** Trim trailing zeros: 7.690 → "7.69", 1.0 → "1". */
export const trim = (n: number, dp = 2) => String(+n.toFixed(dp));

/** A fraction as a signed percent: 0.0769 → "+7.69%". */
export const signedFrac = (n: unknown, dp = 2) => (ok(n) ? `${n >= 0 ? "+" : ""}${trim(n * 100, dp)}%` : "—");

/** ISO date → "12 Nov 2026". */
export function dayMonthYear(iso: unknown): string {
  if (typeof iso !== "string") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
