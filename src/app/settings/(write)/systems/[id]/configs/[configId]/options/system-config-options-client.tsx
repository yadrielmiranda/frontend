"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  updateSystemConfigOptions,
  type SystemConfigOptionsManage,
} from "@/app/api/systems.api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type OptionItem = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function OptionsGroup({
  title,
  description,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  description: string;
  options: OptionItem[];
  selectedIds: number[];
  onToggle: (id: number, checked: boolean) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {options.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No options available in this catalog.
        </div>
      ) : (
        <div className="grid gap-3">
          {options.map((option) => {
            const checked = selectedIds.includes(option.id);
            const checkboxId = `${title}-${option.id}`;

            return (
              <div
                key={option.id}
                className="flex items-center space-x-3 rounded-md border p-3"
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={(value) =>
                    onToggle(option.id, value === true)
                  }
                />
                <Label htmlFor={checkboxId} className="font-normal cursor-pointer">
                  {option.name}
                </Label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SystemConfigOptionsClient({
  data,
}: {
  data: SystemConfigOptionsManage;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [activeOptionIds, setActiveOptionIds] = useState<number[]>(
    data.selectedActiveOptionIds
  );
  const [preparationOptionIds, setPreparationOptionIds] = useState<number[]>(
    data.selectedPreparationOptionIds
  );
  const [sillOptionIds, setSillOptionIds] = useState<number[]>(
    data.selectedSillOptionIds
  );
  const [reinforcementOptionIds, setReinforcementOptionIds] = useState<number[]>(
    data.selectedReinforcementOptionIds
  );

  const toggleId = (
    current: number[],
    id: number,
    checked: boolean
  ): number[] => {
    if (checked) {
      if (current.includes(id)) return current;
      return [...current, id];
    }
    return current.filter((x) => x !== id);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await updateSystemConfigOptions(data.idSystem, data.idConfig, {
        activeOptionIds,
        preparationOptionIds,
        sillOptionIds,
        reinforcementOptionIds,
      });

      toast.success("System config options updated successfully.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <OptionsGroup
        title="Active Options"
        description="Select which active options will be available for this config."
        options={data.activeOptionsCatalog}
        selectedIds={activeOptionIds}
        onToggle={(id, checked) =>
          setActiveOptionIds((current) => toggleId(current, id, checked))
        }
      />

      <OptionsGroup
        title="Preparation Options"
        description="Select which preparation options will be available for this config."
        options={data.preparationOptionsCatalog}
        selectedIds={preparationOptionIds}
        onToggle={(id, checked) =>
          setPreparationOptionIds((current) => toggleId(current, id, checked))
        }
      />

      <OptionsGroup
        title="Sill Options"
        description="Select which sill options will be available for this config."
        options={data.sillOptionsCatalog}
        selectedIds={sillOptionIds}
        onToggle={(id, checked) =>
          setSillOptionIds((current) => toggleId(current, id, checked))
        }
      />

      <OptionsGroup
        title="Reinforcement Options"
        description="Select which reinforcement options will be available for this config."
        options={data.reinforcementOptionsCatalog}
        selectedIds={reinforcementOptionIds}
        onToggle={(id, checked) =>
          setReinforcementOptionIds((current) => toggleId(current, id, checked))
        }
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save Options"}
        </Button>
      </div>
    </div>
  );
}