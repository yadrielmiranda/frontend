"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createConfig, updateConfig } from "@/app/api/configs.api";

// Tipos para las props del formulario
type Product = { id: number; name: string; };
type Config = { id: number; conf: string; idProduct: number; };

interface ConfigFormProps {
    config?: Config; // Opcional, para el modo de edición
    products: Product[];
}

export function ConfigForm({ config, products }: ConfigFormProps) {
    const router = useRouter();
    const params = useParams<{ id: string }>();

    // Estados para los campos del formulario
    const [conf, setConf] = useState(config?.conf || "");
    const [idProduct, setIdProduct] = useState(config ? String(config.idProduct) : "");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        
        try {
            const configData = {
                conf,
                idProduct: Number(idProduct),
            };

            if (params.id) {
                await updateConfig(Number(params.id), configData);
            } else {
                await createConfig(configData);
            }
            router.push("/settings/configs");
            router.refresh();
        } catch (err: any) {
            console.error("Error al guardar la configuración:", err);
            // Podrías añadir un estado para mostrar el error en la UI
        } finally {
            setIsLoading(false);
        }
    };
    
    const isButtonDisabled = !conf.trim() || !idProduct || isLoading;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="conf">Nombre de la Configuración</Label>
                <Input
                    id="conf"
                    placeholder="Ej: Standard, Premium, etc."
                    value={conf}
                    onChange={(e) => setConf(e.target.value)}
                />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="product">Producto</Label>
                <Select value={idProduct} onValueChange={setIdProduct}>
                    <SelectTrigger id="product">
                        <SelectValue placeholder="Selecciona un producto" />
                    </SelectTrigger>
                    <SelectContent>
                        {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                                {product.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit" variant={params.id ? "blue" : "green"} disabled={isButtonDisabled}>
                    {isLoading ? "Guardando..." : (params.id ? "Actualizar" : "Crear")}
                </Button>
            </div>
        </form>
    );
}
