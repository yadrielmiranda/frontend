// src/app/estimates/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getEstimates } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import { EstimatesClient } from "@/components/estimates/estimates-client";
import { notFound } from "next/navigation";

export default async function EstimatesPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  const estimates = await getEstimates();

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Estimates</h1>
        <Button variant="green" asChild>
          <Link href="/estimates/new">+ New Estimate</Link>
        </Button>
      </div>

      <EstimatesClient initialEstimates={estimates} currentUser={user} />
    </div>
  );
}
