import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getConfigCategories } from "@/app/api/config-categories.api";
import { getProducts } from "@/app/api/products.api";
import { ConfigCategoryForm } from "../../new/config-category-form";

export default async function EditConfigCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categoryId = Number(id);

  if (Number.isNaN(categoryId)) notFound();

  const [categories, products] = await Promise.all([
    getConfigCategories(),
    getProducts(),
  ]);

  const category = categories.find((item) => item.id === categoryId);

  if (!category) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Config Category</CardTitle>
            <CardDescription>
              Update the category name, order, and status.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ConfigCategoryForm category={category} products={products} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
