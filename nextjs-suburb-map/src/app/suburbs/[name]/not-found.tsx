import Link from "next/link";
import { KEYS_URL } from "@/lib/sandbox";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-24 text-center">
      <p className="text-[13px] font-medium uppercase tracking-[.12em] text-brand-deep">Suburb report</p>
      <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.03em]">No report for that suburb</h1>
      <p className="mt-3 text-[16px] text-slate">
        The demo runs on the public sandbox key, which covers nine sample suburbs, one per state and territory.{" "}
        <a href={KEYS_URL} className="font-medium text-brand-deep underline-offset-2 hover:underline">
          Get a key
        </a>{" "}
        for every suburb in Australia.
      </p>
      <Link href="/suburbs" className="mt-6 inline-block rounded-xl bg-brand px-5 py-2.5 text-[15px] font-medium text-white">
        See the sample suburbs
      </Link>
    </main>
  );
}
