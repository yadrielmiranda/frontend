import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBrand } from "@/app/api/brands.api";
import { BrandForm } from "../../new/brand-form";

export default async function EditBrand({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; //si es necesario el await
  const brand = await getBrand(id);

  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Edit Brand</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm brand={brand} />
        </CardContent>
      </Card>
    </div>
  );
}
