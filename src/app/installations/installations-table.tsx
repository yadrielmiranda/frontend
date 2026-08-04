"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  INSTALLATION_JOB_STATUSES,
  installationStageLabelFromStatus,
} from "@/lib/installation-flow";
import type {
  InstallationJobStatus,
  InstallationJobsPage,
  InstallationListQuery,
  InstallationListScope,
} from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const scopes: Array<{ value: InstallationListScope; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "all", label: "All" },
];

function listHref(query: InstallationListQuery): string {
  const params = new URLSearchParams();
  if ((query.page ?? 1) > 1) params.set("page", String(query.page));
  if ((query.pageSize ?? 25) !== 25) {
    params.set("pageSize", String(query.pageSize));
  }
  if ((query.scope ?? "active") !== "active") {
    params.set("scope", query.scope!);
  }
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  const serialized = params.toString();
  return serialized ? `/installations?${serialized}` : "/installations";
}

function stageClass(status: InstallationJobStatus): string {
  if (status === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "CANCELED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (["MEASUREMENT_SCHEDULED", "SCHEDULED"].includes(status)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (["IN_PROGRESS", "PERMIT_PROCESSING"].includes(status)) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (
    [
      "DEPOSIT_PAYMENT_PENDING",
      "MEASUREMENT_PENDING",
      "ADMIN_APPROVAL_PENDING",
      "CUSTOMER_APPROVAL_PENDING",
      "PERMIT_PAYMENT_PENDING",
      "MATERIAL_PAYMENT_PENDING",
      "INSTALLATION_PAYMENT_PENDING",
    ].includes(status)
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function InstallationsTable({
  result,
  query,
  isAdmin,
}: {
  result: InstallationJobsPage;
  query: InstallationListQuery;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.search ?? "");

  useEffect(() => setSearch(query.search ?? ""), [query.search]);

  const navigate = (next: InstallationListQuery) => {
    startTransition(() => router.push(listHref(next)));
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({
      ...query,
      page: 1,
      search: search.trim() || undefined,
    });
  };

  const currentHref = listHref(query);
  const firstItem = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastItem = Math.min(result.page * result.pageSize, result.total);
  const hasFilters = Boolean(
    query.search ||
      query.status ||
      query.scope !== "active" ||
      query.pageSize !== 25,
  );

  return (
    <Card aria-busy={isPending} className={isPending ? "opacity-70" : undefined}>
      <CardContent className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {scopes.map((scope) => (
            <Button
              key={scope.value}
              type="button"
              size="sm"
              variant={query.scope === scope.value ? "default" : "outline"}
              disabled={isPending}
              onClick={() =>
                navigate({
                  ...query,
                  page: 1,
                  scope: scope.value,
                  status: undefined,
                })
              }
            >
              {scope.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={applySearch}>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                maxLength={100}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Order, Estimate, or customer..."
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Select
              value={query.status ?? "ALL"}
              disabled={isPending}
              onValueChange={(value) => {
                const status =
                  value === "ALL"
                    ? undefined
                    : (value as InstallationJobStatus);
                const scope =
                  status === "COMPLETED"
                    ? "completed"
                    : status === "CANCELED"
                      ? "canceled"
                      : status && query.scope !== "all"
                        ? "active"
                        : query.scope;
                navigate({
                  ...query,
                  page: 1,
                  scope,
                  status,
                });
              }}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All stages</SelectItem>
                {INSTALLATION_JOB_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {installationStageLabelFromStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(query.pageSize ?? 25)}
              disabled={isPending}
              onValueChange={(value) =>
                navigate({
                  ...query,
                  page: 1,
                  pageSize: Number(value) as 25 | 50 | 100,
                })
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setSearch("");
                  navigate({ page: 1, pageSize: 25, scope: "active" });
                }}
              >
                <X className="mr-2 h-4 w-4" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Next appointment</TableHead>
                <TableHead className="text-center">Openings</TableHead>
                <TableHead>Latest quote</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {hasFilters
                      ? "No installations match these filters."
                      : "No installation requests yet."}
                  </TableCell>
                </TableRow>
              ) : (
                result.items.map((job) => {
                  const owner = job.estimate.user;
                  const customerName =
                    [
                      job.estimate.customerFirstName ?? owner.firstName,
                      job.estimate.customerLastName ?? owner.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—";
                  const stage = installationStageLabelFromStatus(
                    job.status,
                    job.latestQuote?.approvalReason,
                  );

                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="font-medium">
                          {job.estimate.order
                            ? `Order #${job.estimate.order.number}`
                            : `Estimate #${job.estimate.number}`}
                        </div>
                        {job.estimate.order && (
                          <div className="text-xs text-muted-foreground">
                            Estimate #{job.estimate.number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{customerName}</div>
                        {isAdmin && (
                          <div className="text-xs text-muted-foreground">
                            Account: {owner.username} · {owner.role.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={stageClass(job.status)}>
                          {stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.nextAppointment ? (
                          <>
                            <div className="font-medium">
                              {dateTime.format(
                                new Date(job.nextAppointment.startsAt),
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {job.nextAppointment.type === "REMEASUREMENT"
                                ? "Remeasurement"
                                : "Installation"}
                              {` · ${
                                job.nextAppointment.status === "ACCEPTED"
                                  ? "Accepted"
                                  : "Proposed"
                              }`}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {job.openings}
                      </TableCell>
                      <TableCell>
                        {job.latestQuote ? (
                          <>
                            <div className="font-medium">
                              {money.format(Number(job.latestQuote.total))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Version {job.latestQuote.version}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{dateTime.format(new Date(job.updatedAt))}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link
                            href={{
                              pathname: `/installations/${job.id}`,
                              query: { returnTo: currentHref },
                            }}
                          >
                            Open
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            Showing {firstItem}–{lastItem} of {result.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || result.page <= 1}
              onClick={() => navigate({ ...query, page: result.page - 1 })}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <span className="min-w-24 text-center">
              Page {result.page} of {result.totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || result.page >= result.totalPages}
              onClick={() => navigate({ ...query, page: result.page + 1 })}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
