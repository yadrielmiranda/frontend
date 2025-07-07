import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EstimateForm } from "../../new/estimate-form"; 
// API functions
import { getEstimate } from "@/app/api/estimates.api";
import { getProductsWithBrands } from "@/app/api/products.api";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getFColors } from "@/app/api/fcolors.api";
import { getCrystals } from "@/app/api/crystals.api";


export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  
  const { id } = await params; 
  const estimateId = Number(id);

  // Obtenemos el token aquí, en el Server Component
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  // Obtenemos todos los datos necesarios en paralelo
  const [
    estimate,
    productsWithBrands,
    systemsWithConfigs,
    frameColors,
    crystals,
    tints,
    coatings,
  ] = await Promise.all([
    getEstimate(estimateId, token), // Obtenemos el presupuesto específico
    getProductsWithBrands(),
    getSystemsWithConfigs(),
    getFColors(),
    getCrystals(),
    getTints(),
    getCoatings(),
  ]);

  // Si el presupuesto no se encuentra, muestra una página 404
  if (!estimate) {
    notFound();
  }

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-6xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Estimate #{estimate.number}</CardTitle>
          <CardDescription>
            Update the details for this estimate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Le pasamos el presupuesto obtenido al formulario para que entre en "modo edición" */}
          <EstimateForm
            estimate={estimate}
            productsWithBrands={productsWithBrands}
            systemsWithConfigs={systemsWithConfigs}
            frameColors={frameColors}
            crystals={crystals}
            tints={tints}
            coatings={coatings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
