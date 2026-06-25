import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { getProducts } from "@/app/api/products.api";
import { ConfigCategoryForm } from "./config-category-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function NewConfigCategoryPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/config-categories"
          label="Back to Config Categories"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Config Category</CardTitle>
          <CardDescription>
            Create a category to group configurations by product.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ConfigCategoryForm products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
