import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystem } from "@/app/api/systems.api";
import { getBrands } from "@/app/api/brands.api";
import { getProducts } from "@/app/api/products.api";
import { SystemForm } from "../../new/system-form";


export default async function EditSystemPage({ params }: { params: { id: string } }) {
    // Obtenemos todos los datos necesarios en el servidor
    const system = await getSystem(Number(params.id));
    const brands = await getBrands();
    const products = await getProducts();
    
    return (
        <div className="h-screen flex justify-center items-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Editar Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    <SystemForm system={system} brands={brands} products={products} />
                </CardContent>
            </Card>
        </div>
    );
}