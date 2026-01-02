import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigForm } from "./config-form";
import { getProducts } from "@/app/api/products.api";

export default async function NewConfigPage() {
    const products = await getProducts();

    return (
        <div className="h-screen flex justify-center items-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Crear Nueva Configuración</CardTitle>
                </CardHeader>
                <CardContent>
                    <ConfigForm products={products} />
                </CardContent>
            </Card>
        </div>
    );
}
