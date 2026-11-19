import type { Metadata } from "next";
import { DealerRegistration } from "./registration";

export const metadata: Metadata = {
  title: "Dealer network registration | Authentic Evolution",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <DealerRegistration key={token} token={token} />;
}
