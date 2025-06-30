"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createProduct, updateProduct } from "@/app/api/products.api";

export function ProductForm({ product }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: product?.name,
    },
  });
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const onSubmit = handleSubmit(async (data) => {
    if (productName.trim() === "") {
      console.log("El nombre del producto no puede estar vacío.");
      return;
    } else {
      if (params.id) {
        await updateProduct(Number(params.id), data);
      } else {
        await createProduct(data);
      }
    }
    router.push("/settings/products");
  });
  const handleCancel = () => {
    router.back();

    console.log("Operación cancelada.");
  };

  const dfolor = params.id ? "blue" : "green";

  const [productName, setProductName] = useState(product?.name || "");

  const isButtonDisabled =
    productName.trim() === "" || productName.trim() === product?.name;

  return (
    <form onSubmit={onSubmit}>
       <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label>Product Name</Label>
          <Input
            placeholder="Enter product name"
            {...register("name")}
            onChange={(e) => setProductName(e.target.value)}
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
