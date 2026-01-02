import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfig } from "@/app/api/configs.api";
import { getProducts } from "@/app/api/products.api";
import { ConfigForm } from "../../new/config-form";


export default async function EditConfigPage({ params }: { params: Promise<{ id: string }> }) {
   
    const { id: idString } = await params;
    const id = Number(idString);

    if (isNaN(id)) {
        return <p className="text-red-500">Error: ID de configuración no válido.</p>;
    }

    const config = await getConfig(id);
    const products = await getProducts();
    
    return (
        <div className="h-screen flex justify-center items-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Editar Configuración</CardTitle>
                </CardHeader>
                <CardContent>
                    <ConfigForm config={config} products={products} />
                </CardContent>
            </Card>
        </div>
    );
}
