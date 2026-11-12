import type { Metadata } from "next";
import { MicroburbMap } from "./MicroburbMap";

export const metadata: Metadata = { title: "Microburb map", alternates: { canonical: "/map" } };

export default function Page() {
  return <MicroburbMap />;
}
