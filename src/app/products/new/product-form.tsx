"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { createProduct } from "../../../queries/products.api";
import { useParams, useRouter } from "next/navigation";

export function ProductForm({product}: any) {
  console.log(product);
  
  const { register, handleSubmit } = useForm({
    defaultValues:{
      name: product?.name
    }
  });
  const router = useRouter();
  const params = useParams();

  const onSubmit = handleSubmit(async (data) => {
    console.log(data);
    await createProduct(data);
    router.push("/products");
  });

  return (
    <form onSubmit={onSubmit}>
      <Label>Product Name</Label>
      <Input {...register("name")} />
      <Button>
        {
          params.id ? 'Update' : 'Create'
        }
      </Button>
    </form>
  );
}
