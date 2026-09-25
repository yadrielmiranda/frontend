import { getEarningsPlans } from "@/app/api/earnings-plans.api";
import { EarningsPlansClient } from "./earnings-plans-client";

export default async function EarningsPlansPage() {
  return <div className="container mx-auto max-w-6xl py-10">
    <EarningsPlansClient initialPlans={await getEarningsPlans()} />
  </div>;
}
