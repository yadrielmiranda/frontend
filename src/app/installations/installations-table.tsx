"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
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
  installationAppointmentStatusLabel,
  installationAppointmentTypeLabel,
  installationStageLabelFromStatus,
} from "@/lib/installation-flow";
import { estimateStatusLabel } from "@/lib/estimate-status";
import { formatMoney } from "@/lib/formatters";
import type {
  InstallationJobStatus,
  InstallationJobsPage,
  InstallationListQuery,
  InstallationListScope,
} from "@/lib/types";

const dateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const dates = {
  en: new Intl.DateTimeFormat("en-US", dateOptions),
  es: new Intl.DateTimeFormat("es-US", dateOptions),
};

const scopes: { value: InstallationListScope; en: string; es: string }[] = [
  { value: "active", en: "Active", es: "Activas" },
  { value: "completed", en: "Completed", es: "Completadas" },
  { value: "canceled", en: "Canceled", es: "Canceladas" },
  { value: "all", en: "All", es: "Todas" },
];

const rolesEs = new Map([
  ["admin", "Administrador"], ["operator", "Operador"], ["client", "Cliente"],
  ["dealer", "Distribuidor"], ["technician", "Técnico"],
]);

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
  const { locale } = usePortalLanguage();
  const spanish = locale === "es";
  const dateTime = dates[locale];
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
              {scope[locale]}
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
                aria-label={spanish ? "Buscar por orden, cotización o cliente" : "Search by Order, Estimate, or customer"}
                placeholder={spanish ? "Buscar por orden, cotización o cliente..." : "Search Order, Estimate, or customer..."}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {spanish ? "Buscar" : "Search"}
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
              <SelectTrigger className="w-[240px]" aria-label={spanish ? "Filtrar por etapa" : "Filter by stage"}>
                <SelectValue placeholder={spanish ? "Todas las etapas" : "All stages"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{spanish ? "Todas las etapas" : "All stages"}</SelectItem>
                {INSTALLATION_JOB_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {installationStageLabelFromStatus(status, undefined, locale)}
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
              <SelectTrigger className="w-[130px]" aria-label={spanish ? "Filas por página" : "Rows per page"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map(size => (
                  <SelectItem key={size} value={String(size)}>{size} {spanish ? "filas" : "rows"}</SelectItem>
                ))}
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
                <X className="mr-2 h-4 w-4" /> {spanish ? "Restablecer" : "Reset"}
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{spanish ? "Referencia" : "Reference"}</TableHead>
                <TableHead>{spanish ? "Cliente" : "Customer"}</TableHead>
                <TableHead>{spanish ? "Etapa" : "Stage"}</TableHead>
                <TableHead>{spanish ? "Próxima cita" : "Next appointment"}</TableHead>
                <TableHead className="text-center">{spanish ? "Unidades" : "Units"}</TableHead>
                <TableHead>{spanish ? "Última cotización" : "Latest quote"}</TableHead>
                <TableHead>{spanish ? "Última actualización" : "Updated"}</TableHead>
                <TableHead className="text-right">{spanish ? "Acción" : "Action"}</TableHead>
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
                      ? (spanish ? "Ninguna instalación coincide con estos filtros." : "No installations match these filters.")
                      : (spanish ? "Aún no hay instalaciones activas." : "No active installations yet.")}
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
                  const stage = job.estimate.status?.name === "Canceled"
                    ? estimateStatusLabel("Estimate canceled", locale)
                    : job.status !== "CANCELED" && job.estimate.status?.name === "Pending order review"
                      ? estimateStatusLabel("Pending order review", locale)
                      : installationStageLabelFromStatus(job.status, job.latestQuote?.approvalReason, locale);

                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="font-medium">
                          {job.estimate.order
                            ? `${spanish ? "Orden" : "Order"} #${job.estimate.order.number}`
                            : `${spanish ? "Cotización" : "Estimate"} #${job.estimate.number}`}
                        </div>
                        {job.estimate.order && (
                          <div className="text-xs text-muted-foreground">
                            {spanish ? "Cotización" : "Estimate"} #{job.estimate.number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{customerName}</div>
                        {isAdmin && (
                          <div className="text-xs text-muted-foreground">
                            {spanish ? "Cuenta" : "Account"}: {owner.username} · {spanish ? rolesEs.get(owner.role.name) ?? owner.role.name : owner.role.name}
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
                              {installationAppointmentTypeLabel(job.nextAppointment.type, locale)}
                              {" · "}{installationAppointmentStatusLabel(job.nextAppointment.status, locale)}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {job.unitCount}
                      </TableCell>
                      <TableCell>
                        {job.latestQuote ? (
                          <>
                            <div className="font-medium">
                              {formatMoney(job.latestQuote.total)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {spanish ? "Versión" : "Version"} {job.latestQuote.version}
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
                            {spanish ? "Abrir" : "Open"}
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
            {spanish ? "Mostrando" : "Showing"} {firstItem}-{lastItem} {spanish ? "de" : "of"} {result.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || result.page <= 1}
              onClick={() => navigate({ ...query, page: result.page - 1 })}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> {spanish ? "Anterior" : "Previous"}
            </Button>
            <span className="min-w-24 text-center">
              {spanish ? "Página" : "Page"} {result.page} {spanish ? "de" : "of"} {result.totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || result.page >= result.totalPages}
              onClick={() => navigate({ ...query, page: result.page + 1 })}
            >
              {spanish ? "Siguiente" : "Next"} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InstallationsHeader({ isAdmin }: { isAdmin: boolean }) {
  const { locale } = usePortalLanguage();
  const spanish = locale === "es";
  const description = isAdmin
    ? (spanish ? "Gestiona las nuevas mediciones, aprobaciones, permisos, citas y trabajos en obra."
      : "Operational queue for remeasurement, approvals, permits, scheduling, and field work.")
    : (spanish ? "Consulta tus solicitudes de instalación, aprobaciones, pagos y citas."
      : "Track your installation requests, approvals, payments, and appointments.");
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{spanish ? "Instalaciones" : "Installations"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
