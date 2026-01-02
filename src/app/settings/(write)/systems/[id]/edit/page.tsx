import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystem } from "@/app/api/systems.api";
import { getBrands } from "@/app/api/brands.api";
import { SystemForm } from "../../new/system-form";

export default async function EditSystemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const systemId = Number(id);

  const [system, brands] = await Promise.all([
    getSystem(systemId),
    getBrands(),
  ]);

  return (
    <div className="h-screen flex justify-center items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Editar Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemForm system={system as any} brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
