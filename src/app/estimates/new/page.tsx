import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstimateForm } from "./estimate-form";
import { getProducts } from "@/app/api/products.api";
import { getBrands } from "@/app/api/brands.api";
// Importa todas las demás funciones API que necesites
import { getSystems } from "@/app/api/systems.api";
import { getConfigs } from "@/app/api/configs.api";


import { getTints } from "@/app/api/tints.api";
import { getCoatings } from "@/app/api/coatings.api";
import { getCrystals } from "@/app/api/cristals.api";
import { getFColors } from "@/app/api/framecolors.api";

export default async function NewEstimatePage() {
    // Obtenemos todos los datos maestros en paralelo para optimizar la carga
    const [
        products, 
        brands, 
        systems, 
        configs, 
        frameColors,
        crystals,
        tints,
        coatings
    ] = await Promise.all([
        getProducts(),
        getBrands(),
        getSystems(),
        getConfigs(),
        getFColors(),
        getCrystals(),
        getTints(),
        getCoatings()
    ]);

    const masterData = { products, brands, systems, configs, frameColors, crystals, tints, coatings };

    return (
        <div className="flex justify-center items-center py-10">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle>Crear Nuevo Presupuesto</CardTitle>
                </CardHeader>
                <CardContent>
                    <EstimateForm masterData={masterData} />
                </CardContent>
            </Card>
        </div>
    );
}