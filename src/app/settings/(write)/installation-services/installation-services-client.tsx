"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  InstallationBillingUnit,
  InstallationRuleMetric,
  InstallationService,
} from "@/lib/types";
import {
  createInstallationService,
  deleteInstallationService,
  type InstallationRuleInput,
  updateInstallationService,
} from "@/app/api/installations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { InstallationStatusBadge } from "@/components/installations/installation-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RuleDraft = {
  id?: number;
  minValue: string;
  minInclusive: boolean;
  maxValue: string;
  maxInclusive: boolean;
  rate: string;
  estimatedMinutes: string;
  isActive: boolean;
};
type ServiceDraft = {
  name: string;
  description: string;
  billingUnit: InstallationBillingUnit;
  ruleMetric: InstallationRuleMetric;
  baseRate: string;
  minimumCharge: string;
  estimatedMinutes: string;
  availableForRequest: boolean;
  availableForField: boolean;
  isActive: boolean;
  sortOrder: string;
  rules: RuleDraft[];
};
const emptyDraft = (): ServiceDraft => ({
  name: "",
  description: "",
  billingUnit: "UNIT",
  ruleMetric: "NONE",
  baseRate: "0",
  minimumCharge: "0",
  estimatedMinutes: "0",
  availableForRequest: false,
  availableForField: true,
  isActive: true,
  sortOrder: "0",
  rules: [],
});
const fromService = (service: InstallationService): ServiceDraft => ({
  name: service.name,
  description: service.description ?? "",
  billingUnit: service.billingUnit,
  ruleMetric: service.ruleMetric,
  baseRate: String(Number(service.baseRate ?? 0)),
  minimumCharge: String(Number(service.minimumCharge ?? 0)),
  estimatedMinutes: String(Number(service.estimatedMinutes ?? 0)),
  availableForRequest: service.availableForRequest,
  availableForField: service.availableForField,
  isActive: service.isActive,
  sortOrder: String(service.sortOrder),
  rules: (service.rules ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((rule) => ({
      id: rule.id,
      minValue: rule.minValue == null ? "" : String(Number(rule.minValue)),
      minInclusive: rule.minInclusive,
      maxValue: rule.maxValue == null ? "" : String(Number(rule.maxValue)),
      maxInclusive: rule.maxInclusive,
      rate: String(Number(rule.rate)),
      estimatedMinutes:
        rule.estimatedMinutes == null
          ? ""
          : String(Number(rule.estimatedMinutes)),
      isActive: rule.isActive,
    })),
});
const billingLabels: Record<InstallationBillingUnit, string> = {
  UNIT: "Per unit",
  PANEL: "Per panel",
  SQFT: "Actual geometry ft²",
  SQFT_RECTANGULAR: "Rectangular ft²",
  LINEAR_FOOT: "Linear foot",
};
const metricLabels: Record<InstallationRuleMetric, string> = {
  NONE: "No ranges (base rate)",
  WIDTH: "Width",
  HEIGHT: "Height",
  AREA: "Area",
  PANEL_COUNT: "Panel count",
  LENGTH: "Length",
};
const timeUnits: Record<InstallationBillingUnit, string> = {
  UNIT: "unit",
  PANEL: "panel",
  SQFT: "ft²",
  SQFT_RECTANGULAR: "ft²",
  LINEAR_FOOT: "linear ft",
};
const validTime = (value: string) =>
  value === "" ||
  (/^\d+(?:\.\d{1,4})?$/.test(value) && Number(value) <= 99999999.9999);
const money = (value: string | number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 4,
      }).format(Number(value));
const filterClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function InstallationServicesClient({
  initialServices,
  canEdit,
}: {
  initialServices: InstallationService[];
  canEdit: boolean;
}) {
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [serviceToRemove, setServiceToRemove] =
    useState<InstallationService | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [usageFilter, setUsageFilter] = useState("all");
  const [formulaFilter, setFormulaFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const busyRef = useRef(false);
  const originalDraft = useRef("");
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const editingService =
    typeof editingId === "number"
      ? (services.find((service) => service.id === editingId) ?? null)
      : null;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services
      .filter(
        (service) =>
          (!query ||
            `${service.name} ${service.description ?? ""}`
              .toLowerCase()
              .includes(query)) &&
          (statusFilter === "all" ||
            service.isActive === (statusFilter === "active")) &&
          (formulaFilter === "all" || service.billingUnit === formulaFilter) &&
          (usageFilter === "all" ||
            (usageFilter === "request" && service.availableForRequest) ||
            (usageFilter === "field" && service.availableForField) ||
            (usageFilter === "automatic" &&
              (service._count?.sysConfs ?? 0) > 0)),
      )
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
  }, [services, search, statusFilter, formulaFilter, usageFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hasFilters = Boolean(
    search ||
      statusFilter !== "all" ||
      usageFilter !== "all" ||
      formulaFilter !== "all",
  );
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setUsageFilter("all");
    setFormulaFilter("all");
    setPage(1);
  };
  const restoreFocus = () => {
    if (opener.current?.isConnected) opener.current.focus();
    else searchInput.current?.focus();
  };
  const openEditor = (
    service: InstallationService | null,
    button: HTMLButtonElement,
  ) => {
    if (busyRef.current || (!canEdit && !service)) return;
    const next = service ? fromService(service) : emptyDraft();
    opener.current = button;
    originalDraft.current = JSON.stringify(next);
    setDraft(next);
    setEditingId(service?.id ?? "new");
    setDiscardOpen(false);
  };
  const requestClose = () => {
    if (busyRef.current || discardOpen) return;
    if (canEdit && JSON.stringify(draft) !== originalDraft.current)
      setDiscardOpen(true);
    else setEditingId(null);
  };
  const updateRule = (index: number, patch: Partial<RuleDraft>) =>
    setDraft((current) => ({
      ...current,
      rules: current.rules.map((rule, i) =>
        i === index ? { ...rule, ...patch } : rule,
      ),
    }));
  const save = async () => {
    if (!canEdit || busyRef.current || editingId === null) return;
    if (!draft.name.trim()) return toast.error("Service name is required.");
    if (!validTime(draft.estimatedMinutes))
      return toast.error(
        "Enter a valid base time: zero or a positive number with up to four decimal places.",
      );
    const invalidTimeRange = draft.rules.findIndex(
      (rule) => !validTime(rule.estimatedMinutes),
    );
    if (invalidTimeRange >= 0)
      return toast.error(
        `Enter a valid time for range ${invalidTimeRange + 1}: zero or a positive number with up to four decimal places, or leave it blank to use the base time.`,
      );
    const rules: InstallationRuleInput[] = draft.rules.map((rule, index) => ({
      ...(rule.id == null ? {} : { id: rule.id }),
      minValue: rule.minValue === "" ? null : Number(rule.minValue),
      minInclusive: rule.minInclusive,
      maxValue: rule.maxValue === "" ? null : Number(rule.maxValue),
      maxInclusive: rule.maxInclusive,
      rate: Number(rule.rate),
      estimatedMinutes:
        rule.estimatedMinutes === "" ? null : Number(rule.estimatedMinutes),
      sortOrder: index,
      isActive: draft.ruleMetric === "NONE" ? false : rule.isActive,
    }));
    busyRef.current = true;
    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        billingUnit: draft.billingUnit,
        ruleMetric: draft.ruleMetric,
        baseRate: Number(draft.baseRate),
        minimumCharge: Number(draft.minimumCharge),
        estimatedMinutes: Number(draft.estimatedMinutes || "0"),
        availableForRequest: draft.availableForRequest,
        availableForField: draft.availableForField,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder) || 0,
        rules,
      };
      const saved =
        editingId === "new"
          ? await createInstallationService(payload)
          : await updateInstallationService(editingId, payload);
      setServices((current) => [
        ...current.filter((service) => service.id !== saved.id),
        saved,
      ]);
      setEditingId(null);
      toast.success("Installation service saved.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!canEdit || busyRef.current || !serviceToRemove) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await deleteInstallationService(serviceToRemove.id);
      setServices((current) =>
        "deleted" in result && result.deleted
          ? current.filter((service) => service.id !== serviceToRemove.id)
          : current.map((service) =>
              service.id === serviceToRemove.id
                ? (result as InstallationService)
                : service,
            ),
      );
      setServiceToRemove(null);
      toast.success("Service updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Installation Services
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage rates, ranges, and availability for installation work.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={(event) => openEditor(null, event.currentTarget)}
            disabled={busy}
          >
            <Plus className="mr-2 h-4 w-4" /> New service
          </Button>
        )}
      </div>
      <section
        aria-label="Find installation services"
        className="rounded-xl border bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(240px,2fr)_1fr_1fr_1.3fr]">
          <div className="space-y-1.5">
            <Label htmlFor="installation-service-search">Search services</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInput}
                id="installation-service-search"
                className="pl-9"
                placeholder="Name or description…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installation-service-status-filter">Status</Label>
            <select
              id="installation-service-status-filter"
              className={filterClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installation-service-usage-filter">
              Available for
            </Label>
            <select
              id="installation-service-usage-filter"
              className={filterClass}
              value={usageFilter}
              onChange={(event) => {
                setUsageFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All uses</option>
              <option value="request">Initial request</option>
              <option value="field">Field addition</option>
              {canEdit && <option value="automatic">Mapped to products</option>}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installation-service-formula-filter">
              Billing formula
            </Label>
            <select
              id="installation-service-formula-filter"
              className={filterClass}
              value={formulaFilter}
              onChange={(event) => {
                setFormulaFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All formulas</option>
              {Object.entries(billingLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex min-h-7 items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {filtered.length} of {services.length} services
          </p>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </section>
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="hidden px-3 py-3 text-left md:table-cell">
                  Formula / ranges
                </th>
                {canEdit && (
                  <>
                    <th className="hidden px-3 py-3 text-right sm:table-cell">
                      Base rate
                    </th>
                    <th className="hidden px-3 py-3 text-right lg:table-cell">
                      Minimum
                    </th>
                  </>
                )}
                <th className="hidden px-3 py-3 text-left xl:table-cell">
                  Availability
                </th>
                <th className="hidden px-3 py-3 text-left sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((service) => (
                <tr
                  key={service.id}
                  className="border-b last:border-0 hover:bg-slate-50/60"
                >
                  <td className="max-w-[360px] px-4 py-3">
                    <div className="font-medium break-words">
                      {service.name}
                    </div>
                    <p
                      className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                      title={service.description ?? undefined}
                    >
                      {service.description || "No description"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground md:hidden">
                      {billingLabels[service.billingUnit]}
                      {canEdit ? ` · ${money(service.baseRate)}` : ""}
                    </p>
                    <span className="mt-1 block sm:hidden">
                      <InstallationStatusBadge isActive={service.isActive} />
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <div>{billingLabels[service.billingUnit]}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {service.ruleMetric === "NONE"
                        ? "Base rate only"
                        : `${metricLabels[service.ruleMetric]}${service.rules ? ` · ${service.rules.length} ranges` : ""}`}
                    </div>
                  </td>
                  {canEdit && (
                    <>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                        {money(service.baseRate)}
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums lg:table-cell">
                        {money(service.minimumCharge)}
                      </td>
                    </>
                  )}
                  <td className="hidden px-3 py-3 text-xs text-muted-foreground xl:table-cell">
                    {[
                      service.availableForRequest && "Initial request",
                      service.availableForField && "Field addition",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Not selectable"}
                    {service._count != null && (
                      <div className="mt-0.5">
                        {service._count.sysConfs} product mappings
                      </div>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <InstallationStatusBadge isActive={service.isActive} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        aria-label={`${canEdit ? "Edit" : "View"} ${service.name}`}
                        disabled={busy}
                        onClick={(event) =>
                          openEditor(service, event.currentTarget)
                        }
                      >
                        {canEdit ? "Edit" : "View"}
                      </Button>
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                          disabled={busy}
                          aria-label={`Delete ${service.name}`}
                          onClick={(event) => {
                            opener.current = event.currentTarget;
                            setServiceToRemove(service);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="font-medium">
              {services.length
                ? "No services match your filters."
                : "No installation services yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {services.length
                ? "Try another search or clear the filters."
                : canEdit
                  ? "Create your first service to start building the catalog."
                  : "Services will appear here when they are added."}
            </p>
            {hasFilters && (
              <Button className="mt-3" variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="installation-service-page-size"
              className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
            >
              Rows per page
            </Label>
            <select
              id="installation-service-page-size"
              className="h-9 w-auto min-w-24 shrink-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {filtered.length
                ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`
                : "0 results"}{" "}
              · Page {currentPage} of {pageCount}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
          onOpenAutoFocus={(event) => {
            if (canEdit) {
              event.preventDefault();
              document.getElementById("installation-service-name")?.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 text-left sm:px-6 sm:pr-14">
            <DialogTitle>
              {editingService
                ? `${canEdit ? "Edit" : "View"} ${editingService.name}`
                : "New service"}
            </DialogTitle>
            <DialogDescription>
              {canEdit
                ? "Set the service details, pricing, and optional rate ranges."
                : "Service details and availability."}
            </DialogDescription>
          </DialogHeader>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-3 top-3 h-8 w-8"
            disabled={busy}
            aria-label="Close service"
            onClick={requestClose}
          >
            <X className="h-4 w-4" />
          </Button>
          {editingId !== null &&
            (canEdit ? (
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                <fieldset disabled={busy} className="space-y-6">
                  <section
                    className="space-y-4"
                    aria-labelledby="service-general-heading"
                  >
                    <h3 id="service-general-heading" className="font-semibold">
                      General
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                      <div className="space-y-2">
                        <Label htmlFor="installation-service-name">Name</Label>
                        <Input
                          id="installation-service-name"
                          value={draft.name}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="installation-service-sort-order">
                          Sort order
                        </Label>
                        <Input
                          id="installation-service-sort-order"
                          type="number"
                          value={draft.sortOrder}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              sortOrder: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="installation-service-description">
                          Description
                        </Label>
                        <Textarea
                          id="installation-service-description"
                          rows={2}
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      {(
                        [
                          ["availableForRequest", "Initial request"],
                          ["availableForField", "Field addition"],
                          ["isActive", "Active"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`installation-service-${key}`}
                            disabled={busy}
                            checked={draft[key]}
                            onCheckedChange={(checked) =>
                              setDraft((current) => ({
                                ...current,
                                [key]: Boolean(checked),
                              }))
                            }
                          />
                          <Label
                            htmlFor={`installation-service-${key}`}
                            className="font-normal"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section
                    className="space-y-4 border-t pt-5"
                    aria-labelledby="service-pricing-heading"
                  >
                    <h3 id="service-pricing-heading" className="font-semibold">
                      Pricing &amp; time
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="installation-service-formula">
                          Billing formula
                        </Label>
                        <Select
                          disabled={busy}
                          value={draft.billingUnit}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              billingUnit: value as InstallationBillingUnit,
                              estimatedMinutes:
                                value === current.billingUnit
                                  ? current.estimatedMinutes
                                  : "0",
                              rules:
                                value === current.billingUnit
                                  ? current.rules
                                  : current.rules.map((rule) => ({
                                      ...rule,
                                      estimatedMinutes: "",
                                    })),
                            }))
                          }
                        >
                          <SelectTrigger id="installation-service-formula">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(billingLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Changing the formula resets base time to 0 and range
                          times to use the base time.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="installation-service-base-rate">
                          Base rate ($/{timeUnits[draft.billingUnit]})
                        </Label>
                        <Input
                          id="installation-service-base-rate"
                          type="number"
                          min="0"
                          step="0.0001"
                          value={draft.baseRate}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              baseRate: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="installation-service-minimum">
                          Minimum charge ($)
                        </Label>
                        <Input
                          id="installation-service-minimum"
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.minimumCharge}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              minimumCharge: event.target.value,
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Applied once to the combined total of this service.
                          Use 0 for no minimum.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="installation-service-time">
                          Base time (min/{timeUnits[draft.billingUnit]})
                        </Label>
                        <Input
                          id="installation-service-time"
                          type="number"
                          min="0"
                          max="99999999.9999"
                          step="0.0001"
                          value={draft.estimatedMinutes}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              estimatedMinutes: event.target.value || "0",
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Estimated installation time per{" "}
                          {timeUnits[draft.billingUnit]}.
                        </p>
                      </div>
                    </div>
                  </section>
                  <section
                    className="space-y-4 border-t pt-5"
                    aria-labelledby="service-ranges-heading"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3
                          id="service-ranges-heading"
                          className="font-semibold"
                        >
                          Rate ranges
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Use a different rate for each measurement range.
                        </p>
                      </div>
                      {draft.ruleMetric !== "NONE" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              rules: [
                                ...current.rules,
                                {
                                  minValue: "",
                                  minInclusive: true,
                                  maxValue: "",
                                  maxInclusive: false,
                                  rate: current.baseRate,
                                  estimatedMinutes: "",
                                  isActive: true,
                                },
                              ],
                            }))
                          }
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add range
                        </Button>
                      )}
                    </div>
                    <div className="max-w-sm space-y-2">
                      <Label htmlFor="installation-service-metric">
                        Rule selector metric
                      </Label>
                      <Select
                        disabled={busy}
                        value={draft.ruleMetric}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            ruleMetric: value as InstallationRuleMetric,
                          }))
                        }
                      >
                        <SelectTrigger id="installation-service-metric">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(metricLabels).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {draft.ruleMetric === "NONE" ? (
                      <p className="rounded-md bg-slate-50 p-3 text-sm text-muted-foreground">
                        The base rate applies to every measurement.
                        {draft.rules.length > 0 &&
                          " When saved, existing ranges will be kept inactive with their rates and profile increases preserved. Selecting a metric again before saving keeps the current ranges."}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Leave the first minimum and last maximum empty. Active
                          ranges must cover every value without overlaps. A
                          blank range time uses the base time; 0 is an explicit
                          time override.
                        </p>
                        {draft.rules.length === 0 && (
                          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                            No ranges yet. Add a range to set its limits and
                            rate.
                          </p>
                        )}
                        {draft.rules.map((rule, index) => (
                          <div
                            key={rule.id ?? `new-${index}`}
                            role="group"
                            aria-label={`Range ${index + 1}`}
                            className="space-y-3 rounded-lg border bg-slate-50/60 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium">
                                Range {index + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`installation-rule-active-${index}`}
                                    disabled={busy}
                                    checked={rule.isActive}
                                    onCheckedChange={(checked) =>
                                      updateRule(index, {
                                        isActive: Boolean(checked),
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor={`installation-rule-active-${index}`}
                                    className="text-xs font-normal"
                                  >
                                    Active
                                  </Label>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-700 hover:bg-red-50 hover:text-red-800"
                                  disabled={busy}
                                  aria-label={`Remove range ${index + 1}`}
                                  onClick={() =>
                                    setDraft((current) => ({
                                      ...current,
                                      rules: current.rules.filter(
                                        (_, i) => i !== index,
                                      ),
                                    }))
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`installation-rule-min-${index}`}
                                >
                                  Minimum
                                </Label>
                                <Input
                                  id={`installation-rule-min-${index}`}
                                  type="number"
                                  step="any"
                                  value={rule.minValue}
                                  placeholder="Open"
                                  onChange={(event) =>
                                    updateRule(index, {
                                      minValue: event.target.value,
                                    })
                                  }
                                />
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`installation-rule-min-inclusive-${index}`}
                                    disabled={busy}
                                    checked={rule.minInclusive}
                                    onCheckedChange={(checked) =>
                                      updateRule(index, {
                                        minInclusive: Boolean(checked),
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor={`installation-rule-min-inclusive-${index}`}
                                    className="text-xs font-normal"
                                  >
                                    Include minimum
                                  </Label>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`installation-rule-max-${index}`}
                                >
                                  Maximum
                                </Label>
                                <Input
                                  id={`installation-rule-max-${index}`}
                                  type="number"
                                  step="any"
                                  value={rule.maxValue}
                                  placeholder="Open"
                                  onChange={(event) =>
                                    updateRule(index, {
                                      maxValue: event.target.value,
                                    })
                                  }
                                />
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`installation-rule-max-inclusive-${index}`}
                                    disabled={busy}
                                    checked={rule.maxInclusive}
                                    onCheckedChange={(checked) =>
                                      updateRule(index, {
                                        maxInclusive: Boolean(checked),
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor={`installation-rule-max-inclusive-${index}`}
                                    className="text-xs font-normal"
                                  >
                                    Include maximum
                                  </Label>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`installation-rule-rate-${index}`}
                                >
                                  Rate ($)
                                </Label>
                                <Input
                                  id={`installation-rule-rate-${index}`}
                                  type="number"
                                  min="0"
                                  step="0.0001"
                                  value={rule.rate}
                                  onChange={(event) =>
                                    updateRule(index, {
                                      rate: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`installation-rule-time-${index}`}
                                >
                                  Time (min/{timeUnits[draft.billingUnit]})
                                </Label>
                                <Input
                                  id={`installation-rule-time-${index}`}
                                  type="number"
                                  min="0"
                                  max="99999999.9999"
                                  step="0.0001"
                                  value={rule.estimatedMinutes}
                                  placeholder={`Use base: ${draft.estimatedMinutes || "0"}`}
                                  onChange={(event) =>
                                    updateRule(index, {
                                      estimatedMinutes: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </section>
                </fieldset>
              </div>
            ) : (
              editingService && (
                <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {editingService.description || "No description"}
                  </p>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    {[
                      ["Formula", billingLabels[editingService.billingUnit]],
                      ["Rule metric", metricLabels[editingService.ruleMetric]],
                      [
                        "Status",
                        editingService.isActive ? "Active" : "Inactive",
                      ],
                      [
                        "Availability",
                        [
                          editingService.availableForRequest &&
                            "Initial request",
                          editingService.availableForField && "Field addition",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Not selectable",
                      ],
                      ["Sort order", String(editingService.sortOrder)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="mt-1 font-medium">
                          {label === "Status" ? (
                            <InstallationStatusBadge
                              isActive={editingService.isActive}
                            />
                          ) : (
                            value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )
            ))}
          <DialogFooter className="shrink-0 border-t bg-white px-5 py-4 sm:px-6">
            <Button variant="outline" disabled={busy} onClick={requestClose}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button onClick={save} disabled={busy}>
                <Save className="mr-2 h-4 w-4" />
                {busy ? "Saving…" : "Save service"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (editingId !== null)
              document.getElementById("installation-service-name")?.focus();
            else restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes to this service have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                setDiscardOpen(false);
                setEditingId(null);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={serviceToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !busyRef.current) setServiceToRemove(null);
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (busyRef.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete or deactivate this service?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{serviceToRemove?.name}” will be deleted if unused; otherwise it
              will be deactivated and preserved for existing records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy ? "Updating…" : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
