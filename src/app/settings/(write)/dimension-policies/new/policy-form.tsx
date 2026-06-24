// src/app/settings/(write)/dimension-policies/new/policy-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  createPolicy,
  updatePolicy,
  type PolicyDetail,
} from "@/app/api/dimension-policies.api";

type Option = { value: number; label: string };

type SystemWithConfigs = {
  id: number;
  name: string;

  systemCrystals?: {
    idCrystal: number;
    sortOrder?: number | null;
    crystal: {
      id: number;
      glass: string;
      isActive?: boolean;
    };
  }[];

  sysconfs: {
    idSystem: number;
    idConfig: number;
    config: { id: number; conf: string } | null;
    reinforcementOptions?: {
      optionId: number;
      option: {
        id: number;
        name: string;
        isActive: boolean;
        sortOrder: number;
      };
    }[];
  }[];
};

type Policy = PolicyDetail;

type PolicyFormProps = {
  initial?: Policy;
  systemsWithConfigs: SystemWithConfigs[];
};

const defaults: Partial<Policy> = {
  isActive: true,
  sizeBasis: "FRAME",
  roundingRule: "ROUND_UP_TO_NEXT",
};

export function PolicyForm({ initial, systemsWithConfigs }: PolicyFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Policy>>(initial ?? defaults);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(initial ?? defaults);
  }, [initial]);

  const systemOptions: Option[] = useMemo(
    () => systemsWithConfigs.map((s) => ({ value: s.id, label: s.name })),
    [systemsWithConfigs],
  );

  const selectedSystem = useMemo(() => {
    if (!form.idSystem) return null;
    return systemsWithConfigs.find((s) => s.id === form.idSystem) ?? null;
  }, [form.idSystem, systemsWithConfigs]);

  const crystalOptions: Option[] = useMemo(() => {
    return (selectedSystem?.systemCrystals ?? [])
      .filter((link) => link.crystal && link.crystal.isActive !== false)
      .sort((a, b) => {
        const sortA = a.sortOrder ?? 0;
        const sortB = b.sortOrder ?? 0;

        if (sortA !== sortB) return sortA - sortB;
        return (a.crystal?.glass ?? "").localeCompare(b.crystal?.glass ?? "");
      })
      .map((link) => ({
        value: link.idCrystal,
        label: link.crystal.glass,
      }));
  }, [selectedSystem]);

  const configOptions: Option[] = useMemo(() => {
    if (!form.idSystem) return [];
    const sys = systemsWithConfigs.find((s) => s.id === form.idSystem);
    if (!sys) return [];
    return sys.sysconfs
      .filter((sc) => !!sc.config)
      .map((sc) => ({ value: sc.config!.id, label: sc.config!.conf }));
  }, [form.idSystem, systemsWithConfigs]);

  const selectedSysConf = useMemo(() => {
    if (!selectedSystem || !form.idSystem || !form.idConfig) return null;

    return (
      selectedSystem.sysconfs.find(
        (sc) => sc.idSystem === form.idSystem && sc.idConfig === form.idConfig,
      ) ?? null
    );
  }, [selectedSystem, form.idSystem, form.idConfig]);

  const reinforcementOptions: Option[] = useMemo(() => {
    return (selectedSysConf?.reinforcementOptions ?? [])
      .filter((link) => link.option?.isActive)
      .sort((a, b) => {
        const sortA = a.option?.sortOrder ?? 0;
        const sortB = b.option?.sortOrder ?? 0;

        if (sortA !== sortB) return sortA - sortB;
        return (a.option?.name ?? "").localeCompare(b.option?.name ?? "");
      })
      .map((link) => ({
        value: link.optionId,
        label: link.option.name,
      }));
  }, [selectedSysConf]);

  const usesReinforcement = reinforcementOptions.length > 0;

  useEffect(() => {
    if (!form.idSystem || !form.idConfig) return;

    const stillValid = configOptions.some((c) => c.value === form.idConfig);

    if (!stillValid) {
      setForm((f) => ({
        ...f,
        idConfig: undefined,
        idReinforcementOption: null,
      }));
    }
  }, [configOptions, form.idSystem, form.idConfig]);

  useEffect(() => {
    if (!form.idSystem) {
      if (form.idCrystal != null) {
        setForm((f) => ({ ...f, idCrystal: undefined }));
      }
      return;
    }

    if (!form.idCrystal) return;

    const stillValid = crystalOptions.some(
      (crystal) => crystal.value === form.idCrystal,
    );

    if (!stillValid) {
      setForm((f) => ({ ...f, idCrystal: undefined }));
    }
  }, [form.idSystem, form.idCrystal, crystalOptions]);

  useEffect(() => {
    if (!form.idSystem || !form.idConfig) return;

    if (!usesReinforcement) {
      if (form.idReinforcementOption != null) {
        setForm((f) => ({ ...f, idReinforcementOption: null }));
      }
      return;
    }

    const stillValid = reinforcementOptions.some(
      (option) => option.value === form.idReinforcementOption,
    );

    if (!stillValid) {
      setForm((f) => ({ ...f, idReinforcementOption: undefined }));
    }
  }, [
    form.idSystem,
    form.idConfig,
    form.idReinforcementOption,
    usesReinforcement,
    reinforcementOptions,
  ]);

  const isEdit = Boolean(form.id && form.id !== 0);

  const isDirty = useMemo(() => {
    const base = initial ?? (defaults as Partial<Policy>);
    const pick = (p: Partial<Policy>) => ({
      idSystem: p.idSystem ?? undefined,
      idConfig: p.idConfig ?? undefined,
      idCrystal: p.idCrystal ?? undefined,
      idReinforcementOption: p.idReinforcementOption ?? null,
      sizeBasis: p.sizeBasis ?? "FRAME",
      roundingRule: p.roundingRule ?? "ROUND_UP_TO_NEXT",
      isActive: p.isActive ?? true,
      notes: p.notes ?? "",
    });
    return JSON.stringify(pick(form)) !== JSON.stringify(pick(base));
  }, [form, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    try {
      if (!form.idSystem || !form.idConfig || !form.idCrystal) {
        toast.error("Please select System, Config, and Crystal.");
        return;
      }

      const crystalBelongsToSystem = crystalOptions.some(
        (crystal) => crystal.value === form.idCrystal,
      );

      if (!crystalBelongsToSystem) {
        toast.error("The selected Crystal is not associated with this System.");
        return;
      }

      if (usesReinforcement && !form.idReinforcementOption) {
        toast.error("Please select a Reinforcement / Interlock option.");
        return;
      }

      setBusy(true);

      const payload = {
        idSystem: form.idSystem,
        idConfig: form.idConfig,
        idCrystal: form.idCrystal,
        idReinforcementOption: usesReinforcement
          ? form.idReinforcementOption
          : null,
        sizeBasis: form.sizeBasis ?? "FRAME",
        roundingRule: form.roundingRule ?? "ROUND_UP_TO_NEXT",
        notes: form.notes ?? undefined,
        isActive: form.isActive ?? true,
      };

      const saved = isEdit
        ? await updatePolicy(form.id!, payload)
        : await createPolicy(payload);

      toast.success("Policy saved.");

      if (!isEdit) {
        router.push(`/settings/dimension-policies/${saved.id}/edit`);
      } else {
        router.push("/settings/dimension-policies");
      }
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (
        msg.toLowerCase().includes("unique") ||
        msg.toLowerCase().includes("uq_")
      ) {
        toast.error(
          "A policy already exists for this System + Config + Crystal + Reinforcement.",
        );
      } else {
        toast.error(err?.message ?? "Failed to save policy.");
      }
    } finally {
      setBusy(false);
    }
  };
  const selectTriggerClass = "w-full min-w-0 [&>span]:truncate";

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-3">
          <Label>System</Label>
          <Select
            value={form.idSystem ? String(form.idSystem) : ""}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idSystem: Number(v) || undefined,
                idConfig: undefined,
                idCrystal: undefined,
                idReinforcementOption: null,
              }))
            }
            disabled={busy}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Select system..." />
            </SelectTrigger>
            <SelectContent>
              {systemOptions.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 xl:col-span-2">
          <Label>Config</Label>
          <Select
            value={form.idConfig ? String(form.idConfig) : ""}
            disabled={!form.idSystem || busy}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idConfig: Number(v) || undefined,
                idReinforcementOption: undefined,
              }))
            }
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue
                placeholder={
                  form.idSystem ? "Select config..." : "Select system first..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              {configOptions.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 xl:col-span-4">
          <Label>Crystal</Label>
          <Select
            value={form.idCrystal ? String(form.idCrystal) : ""}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idCrystal: Number(v) || undefined,
              }))
            }
            disabled={!form.idSystem || busy || crystalOptions.length === 0}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue
                placeholder={
                  !form.idSystem
                    ? "Select system first..."
                    : crystalOptions.length > 0
                      ? "Select crystal..."
                      : "No crystals for this system"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {crystalOptions.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 xl:col-span-3">
          <Label>Reinforcement</Label>
          <Select
            value={
              form.idReinforcementOption != null
                ? String(form.idReinforcementOption)
                : ""
            }
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idReinforcementOption: Number(v) || undefined,
              }))
            }
            disabled={!usesReinforcement || busy}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue
                placeholder={
                  !form.idSystem || !form.idConfig
                    ? "Select config first..."
                    : usesReinforcement
                      ? "Select option..."
                      : "Not used"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {reinforcementOptions.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Size Basis</Label>
          <Select
            value={form.sizeBasis ?? "FRAME"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, sizeBasis: v as Policy["sizeBasis"] }))
            }
            disabled={busy}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FRAME">FRAME</SelectItem>
              <SelectItem value="DLO">DLO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Rounding</Label>
          <Select
            value={form.roundingRule ?? "ROUND_UP_TO_NEXT"}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                roundingRule: v as Policy["roundingRule"],
              }))
            }
            disabled={busy}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ROUND_UP_TO_NEXT">ROUND_UP_TO_NEXT</SelectItem>
              <SelectItem value="NEAREST">NEAREST</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={!!form.isActive}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isActive: !!checked }))
              }
              disabled={busy}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Enter notes..."
          disabled={busy}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={!isDirty || busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? "Saving..." : isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
