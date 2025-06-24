"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createFColor, updateFColor } from "@/app/api/framecolors.api";

export function FcolorForm({ fcolor }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      color: fcolor?.color,
    },
  });
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const onSubmit = handleSubmit(async (data) => {
    if (fcolorName.trim() === "") {
      console.log("El color no puede estar vacío.");
      return;
    } else {
      if (params.id) {
        await updateFColor(params.id, data);
      } else {
        console.log("este es el color");
      
        console.log(data);
        
        await createFColor(data);
      }
    }
    router.push("/settings/framecolors");
  });
  const handleCancel = () => {
    router.back();

    console.log("Operación cancelada.");
  };

  const dfolor = params.id ? "blue" : "green";

  const [fcolorName, setFcolorName] = useState(fcolor?.color || "");

  const isButtonDisabled =
    fcolorName.trim() === "" || fcolorName.trim() === fcolor?.color;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label>Color</Label>
          <Input
            placeholder="Enter color name"
            {...register("color")}
            onChange={(e) => setFcolorName(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" variant={dfolor} disabled={isButtonDisabled}>
            {" "}
            {params.id ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
