// src/app/estimates/page.tsx
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getEstimates } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session";
import { EstimatesClient } from "@/components/estimates/EstimatesClient";

export default async function EstimatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const user = await getCurrentUser();
  const estimates = await getEstimates(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Estimates</h1>
        <Button variant="green" asChild>
          <Link href="/estimates/new">+ New Estimate</Link>
        </Button>
      </div>

      <div className="container mx-auto py-10">
        <EstimatesClient
          initialEstimates={estimates}
          currentUser={user}  // ✅ directo, ya es AuthUser | null
        />
      </div>
    </div>
  );
}
