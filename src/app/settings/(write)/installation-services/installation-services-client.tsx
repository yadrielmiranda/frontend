"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

type RuleDraft = {
  minValue: string;
  minInclusive: boolean;
  maxValue: string;
  maxInclusive: boolean;
  rate: string;
};

type ServiceDraft = {
  name: string;
  description: string;
  billingUnit: InstallationBillingUnit;
  ruleMetric: InstallationRuleMetric;
  baseRate: string;
  minimumCharge: string;
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
  baseRate: String(Number(service.baseRate)),
  minimumCharge: String(Number(service.minimumCharge)),
  availableForRequest: service.availableForRequest,
  availableForField: service.availableForField,
  isActive: service.isActive,
  sortOrder: String(service.sortOrder),
  rules: service.rules
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((rule) => ({
      minValue: rule.minValue == null ? "" : String(Number(rule.minValue)),
      minInclusive: rule.minInclusive,
      maxValue: rule.maxValue == null ? "" : String(Number(rule.maxValue)),
      maxInclusive: rule.maxInclusive,
      rate: String(Number(rule.rate)),
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

function money(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

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
  const [serviceToRemove, setServiceToRemove] =
    useState<InstallationService | null>(null);

  const editingService = useMemo(
    () =>
      typeof editingId === "number"
        ? services.find((service) => service.id === editingId) ?? null
        : null,
    [editingId, services],
  );

  const openNew = () => {
    setEditingId("new");
    setDraft(emptyDraft());
  };

  const openEdit = (service: InstallationService) => {
    setEditingId(service.id);
    setDraft(fromService(service));
  };

  const updateRule = (index: number, patch: Partial<RuleDraft>) => {
    setDraft((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    }));
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Service name is required.");
      return;
    }

    const rules: InstallationRuleInput[] =
      draft.ruleMetric === "NONE"
        ? []
        : draft.rules.map((rule, index) => ({
            minValue: rule.minValue === "" ? null : Number(rule.minValue),
            minInclusive: rule.minInclusive,
            maxValue: rule.maxValue === "" ? null : Number(rule.maxValue),
            maxInclusive: rule.maxInclusive,
            rate: Number(rule.rate),
            sortOrder: index,
            isActive: true,
          }));

    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        billingUnit: draft.billingUnit,
        ruleMetric: draft.ruleMetric,
        baseRate: Number(draft.baseRate),
        minimumCharge: Number(draft.minimumCharge),
        availableForRequest: draft.availableForRequest,
        availableForField: draft.availableForField,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder) || 0,
        rules,
      };
      const saved =
        editingId === "new"
          ? await createInstallationService(payload)
          : await updateInstallationService(Number(editingId), payload);

      setServices((current) => {
        const without = current.filter((service) => service.id !== saved.id);
        return [...without, saved].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );
      });
      setEditingId(null);
      toast.success("Installation service saved.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (service: InstallationService) => {
    setBusy(true);
    try {
      const result = await deleteInstallationService(service.id);
      if ("deleted" in result && result.deleted) {
        setServices((current) =>
          current.filter((candidate) => candidate.id !== service.id),
        );
      } else {
        setServices((current) =>
          current.map((candidate) =>
            candidate.id === service.id
              ? (result as InstallationService)
              : candidate,
          ),
        );
      }
      toast.success("Service updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Installation Services
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One neutral catalog for automatic, initially requested, and
            field-added services. Names never control calculation logic.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openNew} disabled={busy}>
            <Plus className="mr-2 h-4 w-4" /> New service
          </Button>
        )}
      </div>

      {editingId !== null && (
        <Card className="border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle>
              {editingService ? `Edit ${editingService.name}` : "New service"}
            </CardTitle>
            <CardDescription>
              Configure the formula and optional complete, non-overlapping
              metric ranges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
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
                <Label>Base rate</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
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
                <Label>Minimum charge</Label>
                <Input
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
                  Applied once to the combined total of this service. Use 0
                  for no minimum.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Billing formula</Label>
                <Select
                  value={draft.billingUnit}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      billingUnit: value as InstallationBillingUnit,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(billingLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rule selector metric</Label>
                <Select
                  value={draft.ruleMetric}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      ruleMetric: value as InstallationRuleMetric,
                      rules: value === "NONE" ? [] : current.rules,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(metricLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
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
              <div className="flex flex-wrap items-center gap-5 pt-7">
                {[
                  ["availableForRequest", "Initial request"],
                  ["availableForField", "Field addition"],
                  ["isActive", "Active"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(draft[key as keyof ServiceDraft])}
                      onCheckedChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          [key]: Boolean(checked),
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {draft.ruleMetric !== "NONE" && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Rate ranges</h3>
                    <p className="text-xs text-muted-foreground">
                      Leave the first minimum and last maximum empty. Adjacent
                      boundaries must match and belong to exactly one range.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
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
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add range
                  </Button>
                </div>
                {draft.rules.map((rule, index) => (
                  <div
                    key={index}
                    className="grid items-end gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto]"
                  >
                    <div className="space-y-1">
                      <Label>Minimum</Label>
                      <Input
                        type="number"
                        value={rule.minValue}
                        placeholder="Open"
                        onChange={(event) =>
                          updateRule(index, { minValue: event.target.value })
                        }
                      />
                    </div>
                    <label className="flex h-10 items-center gap-2 text-xs">
                      <Checkbox
                        checked={rule.minInclusive}
                        onCheckedChange={(checked) =>
                          updateRule(index, { minInclusive: Boolean(checked) })
                        }
                      />
                      Inclusive
                    </label>
                    <div className="space-y-1">
                      <Label>Maximum</Label>
                      <Input
                        type="number"
                        value={rule.maxValue}
                        placeholder="Open"
                        onChange={(event) =>
                          updateRule(index, { maxValue: event.target.value })
                        }
                      />
                    </div>
                    <label className="flex h-10 items-center gap-2 text-xs">
                      <Checkbox
                        checked={rule.maxInclusive}
                        onCheckedChange={(checked) =>
                          updateRule(index, { maxInclusive: Boolean(checked) })
                        }
                      />
                      Inclusive
                    </label>
                    <div className="space-y-1">
                      <Label>Rate</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rule.rate}
                        onChange={(event) =>
                          updateRule(index, { rate: event.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          rules: current.rules.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingId(null)}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={save} disabled={busy}>
                <Save className="mr-2 h-4 w-4" />
                {busy ? "Saving…" : "Save service"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id} className={!service.isActive ? "opacity-65" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription>{service.description || "No description"}</CardDescription>
                </div>
                <Badge variant={service.isActive ? "default" : "secondary"}>
                  {service.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3">
                <span className="text-muted-foreground">Formula</span>
                <span className="text-right font-medium">{billingLabels[service.billingUnit]}</span>
                <span className="text-muted-foreground">Rule metric</span>
                <span className="text-right font-medium">{metricLabels[service.ruleMetric]}</span>
                <span className="text-muted-foreground">Base rate</span>
                <span className="text-right font-medium">{money(service.baseRate)}</span>
                <span className="text-muted-foreground">Minimum charge</span>
                <span className="text-right font-medium">{money(service.minimumCharge)}</span>
                <span className="text-muted-foreground">Ranges</span>
                <span className="text-right font-medium">{service.rules.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {service.availableForRequest && <Badge variant="outline">Initial request</Badge>}
                {service.availableForField && <Badge variant="outline">Field addition</Badge>}
                {(service._count?.sysConfs ?? 0) > 0 && (
                  <Badge variant="outline">{service._count?.sysConfs} mappings</Badge>
                )}
              </div>
              {canEdit && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(service)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setServiceToRemove(service)} disabled={busy}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <DeleteConfirmationDialog
        isOpen={serviceToRemove !== null}
        onClose={() => setServiceToRemove(null)}
        onConfirm={() =>
          serviceToRemove ? remove(serviceToRemove) : Promise.resolve()
        }
        title="Delete or deactivate this service?"
        description={
          serviceToRemove
            ? `“${serviceToRemove.name}” will be deleted if unused; otherwise it will be deactivated and preserved for existing records.`
            : undefined
        }
        confirmText="Continue"
      />
    </div>
  );
}
