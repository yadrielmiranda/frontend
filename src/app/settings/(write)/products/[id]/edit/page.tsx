import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ProductForm } from "../../new/product-form";
import { getProduct } from "@/app/api/products.api";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  if (Number.isNaN(productId)) notFound();

  const product = await getProduct(productId);
  if (!product) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Product</CardTitle>
            <CardDescription>Update the product name.</CardDescription>
          </CardHeader>

          <CardContent>
            <ProductForm product={product} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
