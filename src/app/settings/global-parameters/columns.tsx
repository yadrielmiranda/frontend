"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { GlobalParameter } from "@/app/api/types";
import { updateGlobalParameter } from "@/app/api/global-parameters.api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

const EditableValueCell = ({ row }: { row: any }) => {
  const parameter = row.original as GlobalParameter;
  const router = useRouter();

  const initialDisplayValue =
    parameter.unit === '%'
      ? (parameter.value * 100).toFixed(2)
      : String(parameter.value);

  const [value, setValue] = useState(initialDisplayValue);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    let numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
      toast.error("Invalid value. Please enter a number.");
      setIsLoading(false);
      return;
    }

    //Actualizamos el estado visual a dos decimales justo antes de guardar
    if (parameter.unit === '%') {
        setValue(numericValue.toFixed(2));
    }

    if (parameter.unit === '%') {
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
    <div className="flex items-center gap-2 max-w-[250px]">
      <Input
        type="number"
        step="0.01" 
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
        aria-label="Save value"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4 text-green-600" />
        )}
      </Button>
    </div>
  );
};

// --- Definición Principal de las Columnas ---
export const columns: ColumnDef<GlobalParameter>[] = [
  {
    accessorKey: "key",
    header: "Parameter Key",
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
    cell: EditableValueCell, 
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString('es-ES'),
  },
];
