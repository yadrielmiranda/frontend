import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystem } from "@/app/api/systems.api";
import { getBrands } from "@/app/api/brands.api";
import { SystemForm } from "../../new/system-form";

export default async function EditSystemPage({
  params,
}: {
  params: { id: string };
}) {
  
  const [system, brands] = await Promise.all([
    getSystem(Number(params.id)),
    getBrands(),
  ]);

  return (
    <div className="h-screen flex justify-center items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Editar Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Se elimina la prop 'products' */}
          <SystemForm system={system} brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
