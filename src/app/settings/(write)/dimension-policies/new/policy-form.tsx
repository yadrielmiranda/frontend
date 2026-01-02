"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPolicy,
  updatePolicy,
  type PolicyDetail,
} from "@/app/api/dimension-policies.api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ---- Tipos auxiliares ----
type Option = { value: number; label: string };

// Mínimo necesario de SystemWithConfigs para este formulario
type SystemWithConfigs = {
  id: number;
  name: string;
  sysconfs: {
    idSystem: number;
    idConfig: number;
    config: {
      id: number;
      conf: string;
    } | null;
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

export default function PolicyForm(props: PolicyFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<Partial<Policy>>(props.initial ?? defaults);

  // Rehidratar al cambiar la policy seleccionada
  useEffect(() => {
    setForm(props.initial ?? defaults);
  }, [props.initial]);

  // ---- Opciones para System ----
  const systemOptions: Option[] = useMemo(
    () =>
      props.systemsWithConfigs.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [props.systemsWithConfigs]
  );

  // ---- Opciones para Config (dependen del System seleccionado) ----
  const configOptions: Option[] = useMemo(() => {
    if (!form.idSystem) return [];
    const sys = props.systemsWithConfigs.find((s) => s.id === form.idSystem);
    if (!sys) return [];
    return (
      sys.sysconfs
        .filter((sc) => !!sc.config)
        .map((sc) => ({
          value: sc.config!.id,
          label: sc.config!.conf,
        }))
    );
  }, [form.idSystem, props.systemsWithConfigs]);

  // Si cambias de system y la config actual ya no pertenece, la limpiamos
  useEffect(() => {
    if (!form.idSystem || !form.idConfig) return;
    const stillValid = configOptions.some((c) => c.value === form.idConfig);
    if (!stillValid) {
      setForm((f) => ({ ...f, idConfig: undefined }));
    }
  }, [configOptions, form.idSystem, form.idConfig]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.idSystem || !form.idConfig || !form.idCrystal) {
        toast.error("Selecciona System, Config y Crystal");
        return;
      }

      const payload = {
        idSystem: form.idSystem,
        idConfig: form.idConfig,
        idCrystal: form.idCrystal,
        sizeBasis: form.sizeBasis ?? "FRAME",
        roundingRule: form.roundingRule ?? "ROUND_UP_TO_NEXT",
        notes: form.notes ?? undefined,
        isActive: form.isActive ?? true,
      };

      const saved =
        form.id && form.id !== 0
          ? await updatePolicy(form.id, payload)
          : await createPolicy(payload);

      toast.success("Policy guardada");

      // Redirigir a la lista y refrescar
     if (!form.id || form.id === 0) {
        router.push(`/settings/dimension-policies/${saved.id}/edit`);
      } else {
        // si es edición, puedes quedarte aquí o volver a la lista
        router.push("/settings/dimension-policies");
      }
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("uq_")) {
        toast.error("Ya existe una policy con ese System + Config + Crystal.");
      } else {
        toast.error(err?.message ?? "Error guardando policy");
      }
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      {/* FILA 1: System / Config / Crystal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System */}
        <div>
          <Label>System</Label>
          <Select
            value={form.idSystem ? String(form.idSystem) : ""}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                idSystem: Number(v) || undefined,
                idConfig: undefined, // reset config al cambiar system
              }))
            }
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

        {/* Config (solo las asociadas al system) */}
        <div>
          <Label>Config</Label>
          <Select
            value={form.idConfig ? String(form.idConfig) : ""}
            disabled={!form.idSystem}
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

        {/* Crystal */}
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
          >
            <SelectTrigger>
              <SelectValue placeholder="Select crystal..." />
            </SelectTrigger>
            <SelectContent>
              {props.crystals.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FILA 2: Size Basis / Rounding / Active */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Size Basis</Label>
          <Select
            value={form.sizeBasis ?? "FRAME"}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                sizeBasis: v as Policy["sizeBasis"],
              }))
            }
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
                setForm((f) => ({
                  ...f,
                  isActive: !!checked,
                }))
              }
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              notes: e.target.value,
            }))
          }
          placeholder="Enter notes..."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant={form.id ? "blue" : "green"}>
          {form.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
