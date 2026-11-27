import type { Metadata } from "next";
import { SubmittedDealerConfirmation } from "./submitted-dealer-confirmation";

export const metadata: Metadata = {
  title: "Dealer registration | Authentic Evolution",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SubmittedDealerConfirmation />;
}
