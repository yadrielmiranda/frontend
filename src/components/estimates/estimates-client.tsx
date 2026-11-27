"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import type { CompanyLocale } from "@/components/company/company-content";
import { PromotionBanner } from "@/components/promotions/promotion-banner";
import { EstimatesLoadError } from "./estimates-load-error";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { EstimateWithRelations } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";
import { canCreateEstimate, isAdminRole } from "@/lib/rbac";

import { estimateRoleLabel, estimateStatusLabel, getEstimateColumns, getEstimateStatusName } from "./estimates-columns";

const listCopy = {
  en: {
    title: "Estimates", create: "+ New Estimate", empty: "You don’t have any estimates yet.", first: "Create my first estimate",
    number: "Filter number...", name: "Filter name...", date: "Estimate date",
    users: "All users", roles: "All roles", statuses: "All statuses", clearOwner: "Clear account filter",
    scope: { all: "All estimates", mine: "My estimates", network: "My network" },
  },
  es: {
    title: "Cotizaciones", create: "+ Nueva cotización", empty: "Todavía no tienes cotizaciones.", first: "Crear mi primera cotización",
    number: "Filtrar por número...", name: "Filtrar por nombre...", date: "Fecha de la cotización",
    users: "Todos los usuarios", roles: "Todos los roles", statuses: "Todos los estados", clearOwner: "Quitar filtro de cuenta",
    scope: { all: "Todas las cotizaciones", mine: "Mis cotizaciones", network: "Mi red" },
  },
};

const emptyEstimates: EstimateWithRelations[] = [];

function createOptions(
  values: Array<string | null | undefined>,
  labelFor: (value: string) => string = (value) => value,
): DataTableFilterOption[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: labelFor(value),
      value,
    }));
}

interface EstimatesClientProps {
  initialEstimates: EstimateWithRelations[] | null;
  initialLocale: CompanyLocale;
  currentUser: AuthUser | null;
  ownerId?: number;
}

export function EstimatesClient({
  initialEstimates,
  initialLocale,
  currentUser,
  ownerId,
}: EstimatesClientProps) {
  const { locale } = usePortalLanguage(initialLocale);
  const copy = listCopy[locale];
  const estimates = initialEstimates ?? emptyEstimates;
  const role = currentUser?.role?.name ?? null;
  const isAdmin = isAdminRole(role);
  const [scope, setScope] = useState<'all' | 'mine' | 'network'>('all');
  const [selectedOwner, setSelectedOwner] = useState(ownerId);
  const hasNetwork = role === 'dealer' && estimates.some(estimate => estimate.idUser !== currentUser?.id);
  const visibleEstimates = useMemo(() => estimates.filter(estimate =>
    (!selectedOwner || estimate.idUser === selectedOwner) &&
    (scope === 'all' || (scope === 'mine' ? estimate.idUser === currentUser?.id : estimate.idUser !== currentUser?.id))
  ), [estimates, selectedOwner, scope, currentUser?.id]);

  const columns = useMemo(() => getEstimateColumns(currentUser, locale), [currentUser, locale]);

  const filters = useMemo<DataTableFilter[]>(() => {
    const result: DataTableFilter[] = [
      {
        columnId: "number",
        type: "text",
        placeholder: copy.number,
      },
      {
        columnId: "name",
        type: "text",
        placeholder: copy.name,
      },
      {
        columnId: "date",
        type: "date-range",
        placeholder: copy.date,
      },
    ];

    if (isAdmin || role === "operator" || hasNetwork) {
      result.push(
        {
          columnId: "createdBy",
          type: "select",
          faceted: true,
          allLabel: copy.users,
          options: createOptions(
            estimates.map((estimate) => estimate.user?.username),
          ),
        },
        {
          columnId: "createdByRole",
          type: "select",
          faceted: true,
          allLabel: copy.roles,
          options: createOptions(
            estimates.map((estimate) => (estimate.dealerNetwork?.level ?? estimate.user?.role?.name)?.toLowerCase()),
            (value) => estimateRoleLabel(value, locale),
          ),
        },
      );
    }

    result.push({
      columnId: "status",
      type: "select",
      faceted: true,
      allLabel: copy.statuses,
      options: createOptions(
        estimates.map((estimate) => getEstimateStatusName(estimate)),
        (value) => estimateStatusLabel(value, locale),
      ),
    });

    return result;
  }, [estimates, isAdmin, role, hasNetwork, copy, locale]);

  const emptyClientList = role === "client" && initialEstimates?.length === 0 && !selectedOwner;
  const offerFirstEstimate = emptyClientList && !currentUser?.networkSalesBlocked;

  return (
    <div lang={locale} className="w-full px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">{copy.title}</h1>
        {canCreateEstimate(role) && !offerFirstEstimate && (
          currentUser?.networkSalesBlocked ? <Button variant="green" disabled>{copy.create}</Button> : (
            <Button variant="green" asChild><Link href="/estimates/new">{copy.create}</Link></Button>
          )
        )}
      </div>
      <PromotionBanner locale={locale} />
      {initialEstimates === null ? (
        <EstimatesLoadError locale={locale} />
      ) : emptyClientList ? (
        <section className="space-y-4 rounded-xl border p-6 text-center">
          <p>{copy.empty}</p>
          {offerFirstEstimate && <Button variant="green" asChild><Link href="/estimates/new?welcome=1">{copy.first}</Link></Button>}
        </section>
      ) : (
        <>
          {(hasNetwork || selectedOwner) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {hasNetwork && (['all', 'mine', 'network'] as const).map(value => (
                <Button key={value} size="sm" variant={scope === value ? 'default' : 'outline'}
                  onClick={() => { setScope(value); setSelectedOwner(undefined); }}>
                  {copy.scope[value]}
                </Button>
              ))}
              {selectedOwner && <Button size="sm" variant="outline" onClick={() => setSelectedOwner(undefined)}>{copy.clearOwner}</Button>}
            </div>
          )}
          <DataTable locale={locale} columns={columns} data={visibleEstimates} filters={filters}
            filterPlacement="header" collapsibleFilters filterStorageKey="estimates" pagination scrollMode="page" />
        </>
      )}
    </div>
  );
}
