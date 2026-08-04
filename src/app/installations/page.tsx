import { notFound } from "next/navigation";
import { getInstallations } from "@/app/api/installations.api";
import { getCurrentUser } from "@/lib/session";
import { INSTALLATION_JOB_STATUSES } from "@/lib/installation-flow";
import type {
  InstallationJobStatus,
  InstallationListQuery,
  InstallationListScope,
} from "@/lib/types";
import { InstallationsTable } from "./installations-table";

type SearchValue = string | string[] | undefined;

function first(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: SearchValue, fallback: number): number {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeQuery(
  searchParams: Record<string, SearchValue>,
): Required<Pick<InstallationListQuery, "page" | "pageSize" | "scope">> &
  Pick<InstallationListQuery, "status" | "search"> {
  const rawPageSize = positiveInteger(searchParams.pageSize, 25);
  const pageSize = ([25, 50, 100] as const).includes(
    rawPageSize as 25 | 50 | 100,
  )
    ? (rawPageSize as 25 | 50 | 100)
    : 25;
  const rawScope = first(searchParams.scope);
  let scope: InstallationListScope = [
    "active",
    "completed",
    "canceled",
    "all",
  ].includes(rawScope ?? "")
    ? (rawScope as InstallationListScope)
    : "active";
  const rawStatus = first(searchParams.status);
  const status = INSTALLATION_JOB_STATUSES.includes(
    rawStatus as InstallationJobStatus,
  )
    ? (rawStatus as InstallationJobStatus)
    : undefined;
  if (status === "COMPLETED") {
    scope = "completed";
  } else if (status === "CANCELED") {
    scope = "canceled";
  } else if (status && scope !== "all") {
    scope = "active";
  }
  const search = first(searchParams.search)?.trim().slice(0, 100) || undefined;

  return {
    page: positiveInteger(searchParams.page, 1),
    pageSize,
    scope,
    status,
    search,
  };
}

export default async function InstallationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const query = normalizeQuery(await searchParams);
  const result = await getInstallations(query);
  const isAdmin = user.role.name === "admin";

  return (
    <div className="w-full space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Installations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Operational queue for remeasurement, approvals, permits, scheduling, and field work."
            : "Track your installation requests, approvals, payments, and appointments."}
        </p>
      </div>

      <InstallationsTable
        result={result}
        query={{ ...query, page: result.page }}
        isAdmin={isAdmin}
      />
    </div>
  );
}
