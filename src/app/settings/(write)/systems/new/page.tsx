import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemForm } from "./system-form";
import { getBrands } from "@/app/api/brands.api";

export default async function NewSystemPage() {
  const brands = await getBrands();

  return (
    <div className="h-screen flex justify-center items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Crear Nuevo Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemForm brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
