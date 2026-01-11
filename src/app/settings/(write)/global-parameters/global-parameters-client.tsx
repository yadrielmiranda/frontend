// src/app/settings/(write)/global-parameters/global-parameters-client.tsx
"use client";

import { DataTable } from "@/components/data-table";
import type { GlobalParameter } from "@/lib/types";
import { columns } from "./columns-global-parameters";

export function GlobalParametersClient({
  initialParameters,
}: {
  initialParameters: GlobalParameter[];
}) {
  return <DataTable columns={columns} data={initialParameters} />;
}
