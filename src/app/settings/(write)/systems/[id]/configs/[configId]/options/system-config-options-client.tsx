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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  defaultId,
  onToggle,
  onDefaultChange,
}: {
  title: string;
  description: string;
  options: OptionItem[];
  selectedIds: number[];
  defaultId: number | null;
  onToggle: (id: number, checked: boolean) => void;
  onDefaultChange: (id: number | null) => void;
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
        <RadioGroup
          value={defaultId ? String(defaultId) : ""}
          onValueChange={(value) => onDefaultChange(Number(value))}
          className="grid gap-3"
        >
          {options.map((option) => {
            const checked = selectedIds.includes(option.id);
            const isDefault = defaultId === option.id;
            const checkboxId = `${title}-${option.id}`;
            const radioId = `${title}-default-${option.id}`;

            return (
              <div
                key={option.id}
                className="flex items-center justify-between gap-4 rounded-md border p-3 hover:bg-muted/50"
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="flex flex-1 items-center space-x-3 cursor-pointer"
                  onClick={() => onToggle(option.id, !checked)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggle(option.id, !checked);
                    }
                  }}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    className="cursor-pointer border-gray-400 data-[state=checked]:border-primary"
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={(value) =>
                      onToggle(option.id, value === true)
                    }
                  />
                  <Label
                    htmlFor={checkboxId}
                    onClick={(event) => event.preventDefault()}
                    className="font-normal cursor-pointer"
                  >
                    {option.name}
                  </Label>
                </div>

                <div
                  className="flex items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <RadioGroupItem
                    id={radioId}
                    value={String(option.id)}
                    disabled={!checked}
                    className={
                      checked
                        ? "cursor-pointer border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:text-blue-600"
                        : "cursor-not-allowed border-gray-300 opacity-50"
                    }
                  />

                  <Label
                    htmlFor={radioId}
                    className={
                      isDefault
                        ? "text-xs text-blue-600 font-semibold cursor-pointer"
                        : checked
                          ? "text-xs text-muted-foreground hover:text-blue-400 cursor-pointer"
                          : "text-xs text-muted-foreground/50 cursor-not-allowed"
                    }
                  >
                    {isDefault ? "Default" : "Set as default"}
                  </Label>
                </div>
              </div>
            );
          })}
        </RadioGroup>
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
    data.selectedActiveOptionIds,
  );
  const [preparationOptionIds, setPreparationOptionIds] = useState<number[]>(
    data.selectedPreparationOptionIds,
  );
  const [sillOptionIds, setSillOptionIds] = useState<number[]>(
    data.selectedSillOptionIds,
  );
  const [reinforcementOptionIds, setReinforcementOptionIds] = useState<
    number[]
  >(data.selectedReinforcementOptionIds);

  const [defaultActiveOptionId, setDefaultActiveOptionId] = useState<
    number | null
  >(data.defaultActiveOptionId);

  const [defaultPreparationOptionId, setDefaultPreparationOptionId] = useState<
    number | null
  >(data.defaultPreparationOptionId);

  const [defaultSillOptionId, setDefaultSillOptionId] = useState<number | null>(
    data.defaultSillOptionId,
  );

  const [defaultReinforcementOptionId, setDefaultReinforcementOptionId] =
    useState<number | null>(data.defaultReinforcementOptionId);

  const toggleId = (
    current: number[],
    id: number,
    checked: boolean,
  ): number[] => {
    if (checked) {
      if (current.includes(id)) return current;
      return [...current, id];
    }

    return current.filter((x) => x !== id);
  };

  const handleActiveToggle = (id: number, checked: boolean) => {
    setActiveOptionIds((current) => toggleId(current, id, checked));

    if (!checked && defaultActiveOptionId === id) {
      setDefaultActiveOptionId(null);
    }

    if (checked && defaultActiveOptionId === null) {
      setDefaultActiveOptionId(id);
    }
  };

  const handlePreparationToggle = (id: number, checked: boolean) => {
    setPreparationOptionIds((current) => toggleId(current, id, checked));

    if (!checked && defaultPreparationOptionId === id) {
      setDefaultPreparationOptionId(null);
    }

    if (checked && defaultPreparationOptionId === null) {
      setDefaultPreparationOptionId(id);
    }
  };

  const handleSillToggle = (id: number, checked: boolean) => {
    setSillOptionIds((current) => toggleId(current, id, checked));

    if (!checked && defaultSillOptionId === id) {
      setDefaultSillOptionId(null);
    }

    if (checked && defaultSillOptionId === null) {
      setDefaultSillOptionId(id);
    }
  };

  const handleReinforcementToggle = (id: number, checked: boolean) => {
    setReinforcementOptionIds((current) => toggleId(current, id, checked));

    if (!checked && defaultReinforcementOptionId === id) {
      setDefaultReinforcementOptionId(null);
    }

    if (checked && defaultReinforcementOptionId === null) {
      setDefaultReinforcementOptionId(id);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await updateSystemConfigOptions(data.idSystem, data.idConfig, {
        activeOptionIds,
        preparationOptionIds,
        sillOptionIds,
        reinforcementOptionIds,

        defaultActiveOptionId,
        defaultPreparationOptionId,
        defaultSillOptionId,
        defaultReinforcementOptionId,
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
        defaultId={defaultActiveOptionId}
        onToggle={handleActiveToggle}
        onDefaultChange={setDefaultActiveOptionId}
      />

      <OptionsGroup
        title="Preparation Options"
        description="Select which preparation options will be available for this config."
        options={data.preparationOptionsCatalog}
        selectedIds={preparationOptionIds}
        defaultId={defaultPreparationOptionId}
        onToggle={handlePreparationToggle}
        onDefaultChange={setDefaultPreparationOptionId}
      />

      <OptionsGroup
        title="Sill Options"
        description="Select which sill options will be available for this config."
        options={data.sillOptionsCatalog}
        selectedIds={sillOptionIds}
        defaultId={defaultSillOptionId}
        onToggle={handleSillToggle}
        onDefaultChange={setDefaultSillOptionId}
      />

      <OptionsGroup
        title="Reinforcement Options"
        description="Select which reinforcement options will be available for this config."
        options={data.reinforcementOptionsCatalog}
        selectedIds={reinforcementOptionIds}
        defaultId={defaultReinforcementOptionId}
        onToggle={handleReinforcementToggle}
        onDefaultChange={setDefaultReinforcementOptionId}
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
