"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type {
  InstallationBillingUnit,
  InstallationRuleMetric,
  InstallationService,
  InstallationServiceRule,
} from "@/lib/types";
import {
  adjustedProfileRate,
  profileAdjustmentKey,
  type ProfileAdjustmentDrafts,
} from "@/lib/installation-profile-pricing";
import { InstallationStatusBadge } from "@/components/installations/installation-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const units: Record<InstallationBillingUnit, string> = {
  UNIT: "per unit",
  PANEL: "per panel",
  SQFT: "per ft² of actual geometry",
  SQFT_RECTANGULAR: "per rectangular ft²",
  LINEAR_FOOT: "per linear foot",
};
const metrics: Record<InstallationRuleMetric, string> = {
  NONE: "Value",
  WIDTH: "Width (in)",
  HEIGHT: "Height (in)",
  AREA: "Area (ft²)",
  PANEL_COUNT: "Panels",
  LENGTH: "Length (in)",
};
const rateMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
const filterClassName =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function rangeLabel(
  service: InstallationService,
  rule: InstallationServiceRule,
) {
  const lower =
    rule.minValue == null
      ? ""
      : `${rule.minInclusive ? "≥" : ">"} ${Number(rule.minValue)}`;
  const upper =
    rule.maxValue == null
      ? ""
      : `${rule.maxInclusive ? "≤" : "<"} ${Number(rule.maxValue)}`;
  return `${metrics[service.ruleMetric]}: ${[lower, upper].filter(Boolean).join(" and ") || "all values"}`;
}

export function InstallationProfileRatesEditor({
  services,
  adjustments,
  disabled,
  onChange,
}: {
  services: InstallationService[];
  adjustments: ProfileAdjustmentDrafts;
  disabled: boolean;
  onChange: (value: ProfileAdjustmentDrafts) => void;
}) {
  const [search, setSearch] = useState("");
  const [adjustmentFilter, setAdjustmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(
    null,
  );
  const normalizedSearch = search.trim().toLowerCase();
  const adjustmentCount = (service: InstallationService) =>
    [null, ...(service.rules ?? []).map((rule) => rule.id)].filter(
      (ruleId) => adjustments[profileAdjustmentKey(service.id, ruleId)],
    ).length;
  const visible = services
    .filter((service) => {
      const searchable = [
        service.name,
        service.description ?? "",
        ...(service.rules ?? []).map((rule) => rangeLabel(service, rule)),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (adjustmentFilter === "all" || adjustmentCount(service) > 0)
      );
    })
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name) ||
        a.id - b.id,
    );
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageServices = visible.slice(pageStart, pageStart + pageSize);
  const adjustedServiceCount = services.filter(
    (service) => adjustmentCount(service) > 0,
  ).length;

  const change = (
    serviceId: number,
    ruleId: number | null,
    type: "BASE" | "PERCENT" | "AMOUNT",
    value?: string,
  ) => {
    if (disabled) return;
    const key = profileAdjustmentKey(serviceId, ruleId);
    const next = { ...adjustments };
    if (type === "BASE") delete next[key];
    else
      next[key] = {
        serviceId,
        ruleId,
        type,
        value: value ?? next[key]?.value ?? "0",
      };
    onChange(next);
  };

  const renderRate = (
    service: InstallationService,
    rule?: InstallationServiceRule,
  ) => {
    const ruleId = rule?.id ?? null;
    const key = profileAdjustmentKey(service.id, ruleId);
    const adjustment = adjustments[key];
    const base = Number(rule ? rule.rate : (service.baseRate ?? 0));
    const result = adjustedProfileRate(base, adjustment);
    const label = rule ? rangeLabel(service, rule) : "Base rate";
    const typeId = `profile-rate-type-${key}`;
    const amountId = `profile-rate-value-${key}`;

    return (
      <tr key={key} className="border-t">
        <th scope="row" className="min-w-44 px-4 py-3 text-left font-normal">
          <span>{label}</span>
          {rule && !rule.isActive && (
            <span className="mt-1 block">
              <InstallationStatusBadge isActive={false} />
            </span>
          )}
        </th>
        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
          {rateMoney(base)}
        </td>
        <td className="px-4 py-3">
          <Label className="sr-only" htmlFor={typeId}>
            {service.name} · {label} increase
          </Label>
          <Select
            value={adjustment?.type ?? "BASE"}
            disabled={disabled}
            onValueChange={(type) =>
              change(service.id, ruleId, type as "BASE" | "PERCENT" | "AMOUNT")
            }
          >
            <SelectTrigger id={typeId} className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BASE">Use base price</SelectItem>
              <SelectItem value="PERCENT">Percentage increase</SelectItem>
              <SelectItem value="AMOUNT">Amount increase</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <Label className="sr-only" htmlFor={amountId}>
            {service.name} · {label}{" "}
            {adjustment?.type === "PERCENT" ? "percentage" : "amount"}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={amountId}
              className="min-w-24"
              type="number"
              step="0.0001"
              min={Number(adjustment?.value ?? 0) < 0 ? undefined : "0"}
              value={adjustment?.value ?? "0"}
              disabled={disabled || !adjustment}
              onChange={(event) =>
                change(
                  service.id,
                  ruleId,
                  adjustment?.type ?? "AMOUNT",
                  event.target.value,
                )
              }
            />
            <span className="text-xs text-muted-foreground">
              {adjustment?.type === "PERCENT" ? "%" : "$"}
            </span>
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
          {result == null ? "—" : rateMoney(result)}
        </td>
      </tr>
    );
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold">Service and rule increases</h3>
        <p className="text-sm text-muted-foreground">
          Each rate has its own increase. Rules start from their provider price;
          the service increase is not added to them.
        </p>
        <p className="text-xs text-muted-foreground">
          {services.length} {services.length === 1 ? "service" : "services"} ·{" "}
          {adjustedServiceCount} with adjustments
        </p>
      </div>

      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-white py-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="profile-service-search">Find a service or rule</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            />
            <Input
              id="profile-service-search"
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search names, descriptions or ranges…"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:w-44">
          <Label htmlFor="profile-service-adjustment-filter">
            Show services
          </Label>
          <select
            id="profile-service-adjustment-filter"
            className={filterClassName}
            value={adjustmentFilter}
            onChange={(event) => {
              setAdjustmentFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All services</option>
            <option value="adjusted">With adjustments</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {pageServices.map((service) => {
          const expanded = expandedServiceId === service.id;
          const rules = (service.rules ?? [])
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
          const count = adjustmentCount(service);
          const headingId = `profile-service-heading-${service.id}`;
          const contentId = `profile-service-rates-${service.id}`;

          return (
            <div key={service.id} className="overflow-hidden rounded-lg border">
              <h4>
                <Button
                  id={headingId}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left hover:bg-slate-50"
                  aria-label={`${expanded ? "Hide" : "Show"} rates for ${service.name}`}
                  aria-expanded={expanded}
                  aria-controls={contentId}
                  onClick={() =>
                    setExpandedServiceId(expanded ? null : service.id)
                  }
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="whitespace-normal break-words font-medium">
                          {service.name}
                        </span>
                        {!service.isActive && (
                          <InstallationStatusBadge isActive={false} />
                        )}
                      </span>
                      <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">
                        Rates {units[service.billingUnit]} · {rules.length}{" "}
                        {rules.length === 1 ? "rule" : "rules"}
                      </span>
                    </span>
                    <Badge
                      variant={count ? "secondary" : "outline"}
                      className="shrink-0 self-start font-normal sm:self-center"
                    >
                      {count
                        ? `${count} ${count === 1 ? "adjustment" : "adjustments"}`
                        : "Base prices"}
                    </Badge>
                  </span>
                </Button>
              </h4>
              {expanded && (
                <div id={contentId} role="region" aria-labelledby={headingId}>
                  {service.description && (
                    <p className="border-t bg-slate-50/60 px-4 py-3 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <caption className="sr-only">
                        Provider and profile rates for {service.name}
                      </caption>
                      <thead className="sticky top-0 border-t bg-slate-50 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left">
                            Rate / rule
                          </th>
                          <th scope="col" className="px-4 py-2 text-right">
                            Provider base
                          </th>
                          <th scope="col" className="px-4 py-2 text-left">
                            Increase
                          </th>
                          <th scope="col" className="px-4 py-2 text-left">
                            Value
                          </th>
                          <th scope="col" className="px-4 py-2 text-right">
                            Profile price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderRate(service)}
                        {rules.map((rule) => renderRate(service, rule))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {services.length
              ? "No services match these filters. Try another search or show all services."
              : "Create installation services to set their profile increases."}
          </p>
        )}
      </div>

      {visible.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {pageStart + 1}–{Math.min(pageStart + pageSize, visible.length)} of{" "}
            {visible.length} services
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="profile-service-page-size"
                className="whitespace-nowrap text-xs"
              >
                Per page
              </Label>
              <select
                id="profile-service-page-size"
                className={`${filterClassName} min-w-20`}
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous services page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </Button>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next services page"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        These are rates per billing unit. Quantities and minimum charges are
        applied when the installation is calculated. Provider base prices remain
        unchanged.
      </p>
    </section>
  );
}
