// src/app/settings/(write)/global-parameters/page.tsx
import { getGlobalParameters } from "@/app/api/global-parameters.api";
import { GlobalParametersClient } from "./global-parameters-client";

export default async function GlobalParametersPage() {
  const parameters = await getGlobalParameters();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Global Parameters</h1>
        {/* No "New" button: parameters are predefined */}
      </div>

      <div className="container mx-auto py-10">
        <GlobalParametersClient initialParameters={parameters} />
      </div>
    </div>
  );
}
