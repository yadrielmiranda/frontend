import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { getSystem } from "@/app/api/systems.api";
import { getBrands } from "@/app/api/brands.api";
import { SystemForm } from "../../new/system-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditSystemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const systemId = Number(id);

  // Comentario en español: validación simple del parámetro
  if (Number.isNaN(systemId)) notFound();

  const [system, brands] = await Promise.all([getSystem(systemId), getBrands()]);

  // Comentario en español: si no existe, 404 limpio
  if (!system) notFound();

  return (
    <div className="container mx-auto py-10">
      {/* Navegación */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/systems" label="Back to Systems" />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Edit System</CardTitle>
          <CardDescription>Update the system details.</CardDescription>
        </CardHeader>

        <CardContent>
          <SystemForm system={system} brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
