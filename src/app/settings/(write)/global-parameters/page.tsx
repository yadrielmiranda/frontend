// src/app/settings/(write)/global-parameters/page.tsx
import { getGlobalParameters } from "@/app/api/global-parameters.api";
import { GlobalParametersClient } from "./global-parameters-client";
import Link from "next/link";

export default async function GlobalParametersPage() {
  const parameters = await getGlobalParameters();
  const visibleParameters = parameters.filter((parameter) => ![
    "DELIVERY_BASE_PRICE", "DELIVERY_INCLUDED_MILES", "DELIVERY_ADDITIONAL_MILE_PRICE",
  ].includes(parameter.key));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Global Parameters</h1>
        {/* No "New" button: parameters are predefined */}
      </div>

      <div className="container mx-auto py-10">
        <p className="mb-5 text-sm text-muted-foreground">
          Delivery pricing is managed in{" "}
          <Link href="/settings/warehouse-delivery" className="font-medium underline underline-offset-4">Warehouse &amp; Delivery</Link>.
        </p>
        <GlobalParametersClient initialParameters={visibleParameters} />
      </div>
    </div>
  );
}
