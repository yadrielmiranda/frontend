import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandForm } from "../../new/brand-form";
import { getBrand } from "@/app/api/brands.api";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await getBrand(Number(id));

  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Edit Brand Name</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm brand={brand} />
        </CardContent>
      </Card>
    </div>
  );
}
