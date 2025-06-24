"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createBrand, updateBrand } from "@/app/api/brands.api";

export function BrandForm({ brand }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: brand?.name,
    },
  });
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const onSubmit = handleSubmit(async (data) => {
    if (brandName.trim() === "") {
      console.log("El nombre de brand no puede estar vacío.");
      return;
    } else {
      if (params.id) {
        await updateBrand(params.id, data);
      } else {
        await createBrand(data);
      }
    }
    router.push("/settings/brands");
  });
  const handleCancel = () => {
    router.back();

    console.log("Operación cancelada.");
  };

  const dfolor = params.id ? "blue" : "green";

  const [brandName, setBrandName] = useState(brand?.name || "");

  const isButtonDisabled =
    brandName.trim() === "" || brandName.trim() === brand?.name;

  return (
    <form onSubmit={onSubmit}>
       <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label>Brand Name</Label>
          <Input
            placeholder="Enter brand name"
            {...register("name")}
            onChange={(e) => setBrandName(e.target.value)}
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
