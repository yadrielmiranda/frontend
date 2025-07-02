import { getBrandWithProducts } from "@/app/api/brands.api";
import { getProducts } from "@/app/api/products.api";
import { BrandProductsClient } from "./brand-products-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BrandProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  const brandData = await getBrandWithProducts(brandId);
  const allProducts = await getProducts();

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Manage Products for: {brandData.name}</CardTitle>
          <CardDescription>
            Add or remove products associated with this brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandProductsClient
            brand={brandData}
            allProducts={allProducts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
