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
  sysconfs: {
    idSystem: number;
    idConfig: number;
    config: { id: number; conf: string } | null;
  }[];
};

type Policy = PolicyDetail;

type PolicyFormProps = {
  initial?: Policy;
  systemsWithConfigs: SystemWithConfigs[];
  crystals: Option[];
};

const defaults: Partial<Policy> = {
  isActive: true,
  sizeBasis: "FRAME",
  roundingRule: "ROUND_UP_TO_NEXT",
};

export function PolicyForm({
  initial,
  systemsWithConfigs,
  crystals,
}: PolicyFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Policy>>(initial ?? defaults);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(initial ?? defaults);
  }, [initial]);

  const systemOptions: Option[] = useMemo(
    () => systemsWithConfigs.map((s) => ({ value: s.id, label: s.name })),
    [systemsWithConfigs]
  );

  const configOptions: Option[] = useMemo(() => {
    if (!form.idSystem) return [];
    const sys = systemsWithConfigs.find((s) => s.id === form.idSystem);
    if (!sys) return [];
    return sys.sysconfs
      .filter((sc) => !!sc.config)
      .map((sc) => ({ value: sc.config!.id, label: sc.config!.conf }));
  }, [form.idSystem, systemsWithConfigs]);

  useEffect(() => {
    if (!form.idSystem || !form.idConfig) return;
    const stillValid = configOptions.some((c) => c.value === form.idConfig);
    if (!stillValid) setForm((f) => ({ ...f, idConfig: undefined }));
  }, [configOptions, form.idSystem, form.idConfig]);

  const isEdit = Boolean(form.id && form.id !== 0);

  const isDirty = useMemo(() => {
    const base = initial ?? (defaults as Partial<Policy>);
    const pick = (p: Partial<Policy>) => ({
      idSystem: p.idSystem ?? undefined,
      idConfig: p.idConfig ?? undefined,
      idCrystal: p.idCrystal ?? undefined,
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

      setBusy(true);

      const payload = {
        idSystem: form.idSystem,
        idConfig: form.idConfig,
        idCrystal: form.idCrystal,
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
          "A policy already exists for this System + Config + Crystal."
        );
      } else {
        toast.error(err?.message ?? "Failed to save policy.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>System</Label>
          <Select
            value={form.idSystem ? String(form.idSystem) : ""}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idSystem: Number(v) || undefined,
                idConfig: undefined,
              }))
            }
            disabled={busy}
          >
            <SelectTrigger>
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

        <div>
          <Label>Config</Label>
          <Select
            value={form.idConfig ? String(form.idConfig) : ""}
            disabled={!form.idSystem || busy}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idConfig: Number(v) || undefined,
              }))
            }
          >
            <SelectTrigger>
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

        <div>
          <Label>Crystal</Label>
          <Select
            value={form.idCrystal ? String(form.idCrystal) : ""}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idCrystal: Number(v) || undefined,
              }))
            }
            disabled={busy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select crystal..." />
            </SelectTrigger>
            <SelectContent>
              {crystals.map((o) => (
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
            <SelectTrigger>
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
            <SelectTrigger>
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
