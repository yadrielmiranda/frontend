"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createCoating, updateCoating } from "@/app/api/coatings.api"; // CAMBIO
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// CAMBIO: Tipo de datos del formulario
type FormData = {
  name: string;
};

// CAMBIO: Nombre del componente y props
export function CoatingForm({ coating }: { coating?: FormData & { id: number } }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: coating?.name || "", // CAMBIO
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (params.id) {
        await updateCoating(Number(params.id), data); // CAMBIO
      } else {
        await createCoating(data); // CAMBIO
      }
      setIsSuccess(true);
      router.push("/settings/coatings"); // CAMBIO
      router.refresh();
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    }
  });

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="name">Name</Label> {/* CAMBIO */}
          <Input
            id="name" // CAMBIO
            placeholder="Enter coating name" // CAMBIO
            {...register("name", { // CAMBIO
              required: "El nombre del coating es obligatorio", // CAMBIO
            })}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>} {/* CAMBIO */}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={params.id ? "blue" : "green"}
            disabled={!isDirty || showLoadingState}
          >
            {showLoadingState && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showLoadingState ? "Saving..." : (params.id ? "Update" : "Create")}
          </Button>
        </div>
      </div>
    </form>
  );
}