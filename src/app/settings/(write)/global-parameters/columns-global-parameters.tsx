// src/app/settings/(write)/global-parameters/columns.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { GlobalParameter } from "@/lib/types";
import { updateGlobalParameter } from "@/app/api/global-parameters.api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

const materialOnlyThresholdKey = "MATERIAL_ONLY_UPFRONT_THRESHOLD";

function EditableValueCell({ parameter }: { parameter: GlobalParameter }) {
  const router = useRouter();
  const isMaterialOnlyThreshold = parameter.key === materialOnlyThresholdKey;

  const initialDisplayValue =
    parameter.unit === "%"
      ? (parameter.value * 100).toFixed(2)
      : String(parameter.value);

  const [value, setValue] = useState(initialDisplayValue);
  const previousInitialDisplayValue = useRef(initialDisplayValue);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const previousInitial = previousInitialDisplayValue.current;
    setValue((currentValue) =>
      currentValue === previousInitial ? initialDisplayValue : currentValue,
    );
    previousInitialDisplayValue.current = initialDisplayValue;
  }, [initialDisplayValue]);

  const handleSave = async () => {
    if (isMaterialOnlyThreshold && (
      !/^\d+(?:\.\d{1,2})?$/.test(value.trim()) ||
      !Number.isFinite(Number(value)) || Number(value) > 999999.99
    )) {
      toast.error("Enter a USD amount from 0 to 999,999.99 with at most two decimal places. Set 0 to disable.");
      return;
    }
    setIsLoading(true);

    let numericValue = parseFloat(value);

    if (Number.isNaN(numericValue)) {
      toast.error("Invalid value. Please enter a number.");
      setIsLoading(false);
      return;
    }

    // Normaliza visualmente antes de guardar
    if (parameter.unit === "%") {
      setValue(numericValue.toFixed(2));
      numericValue = numericValue / 100;
    }

    try {
      await updateGlobalParameter(parameter.key, { value: String(numericValue) });
      toast.success(`Parameter '${parameter.key}' updated successfully.`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 max-w-[280px]">
      <Input
        type="number"
        step="0.01"
        min={isMaterialOnlyThreshold ? "0" : undefined}
        max={isMaterialOnlyThreshold ? "999999.99" : undefined}
        aria-label={parameter.key}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-32"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
      />

      {parameter.unit && <span className="text-gray-500">{parameter.unit}</span>}

      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={isLoading}
        className="h-8 w-8"
        aria-label={`Save ${parameter.key}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export const columns: ColumnDef<GlobalParameter>[] = [
  {
    accessorKey: "key",
    header: "Parameter",
    cell: ({ row }) => (
      <div className="font-mono bg-gray-100 px-2 py-1 rounded dark:bg-gray-800">
        {row.original.key}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => <EditableValueCell parameter={row.original} />,
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString("en-US"),
  },
];
