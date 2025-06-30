"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSystem, updateSystem } from "@/app/api/systems.api";
import { getBrandWithProducts } from "@/app/api/brands.api";

type Product = { id: number; name: string; };
type Brand = { id: number; name: string; };
type System = { id: number; name: string; idBrand: number; idProduct: number; };

interface SystemFormProps {
    system?: System;
    brands: Brand[];
}

export function SystemForm({ system, brands }: SystemFormProps) {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const [name, setName] = useState(system?.name || "");
    const [idBrand, setIdBrand] = useState(system ? String(system.idBrand) : "");
    const [idProduct, setIdProduct] = useState(system ? String(system.idProduct) : "");
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [isProductLoading, setIsProductLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProductsForBrand = async () => {
            if (!idBrand) {
                setAvailableProducts([]);
                return;
            }
            setIsProductLoading(true);
            try {
                const brandWithProducts = await getBrandWithProducts(Number(idBrand));
                const products = brandWithProducts.brandProducts.map((bp: any) => bp.product);
                setAvailableProducts(products);
            } catch (err) {
                console.error("Error al obtener productos para la marca:", err);
                setAvailableProducts([]);
            } finally {
                setIsProductLoading(false);
            }
        };

        fetchProductsForBrand();
        if (!system || (system && system.idBrand !== Number(idBrand))) {
             setIdProduct("");
        }
    }, [idBrand]);

     useEffect(() => {
        if(system && !availableProducts.length) {
            const fetchInitialProducts = async () => {
                setIsProductLoading(true);
                const brandData = await getBrandWithProducts(system.idBrand);
                const products = brandData.brandProducts.map((bp: any) => bp.product);
                setAvailableProducts(products);
                setIsProductLoading(false);
            };
            fetchInitialProducts();
        }
    }, [system, availableProducts.length]);


    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
       

        setIsLoading(true);
        setError(null);
        
        const systemData = {
            name,
            idBrand: Number(idBrand),
            idProduct: Number(idProduct),
        };      

        try {
            if (params.id) {
               
                await updateSystem(Number(params.id), systemData);
               
            } else {
                
                await createSystem(systemData);
               
            }

           
            router.push("/settings/systems");
            router.refresh();

        } catch (err: any) {
           
            setError(err.message || "No se pudo guardar. Revisa la consola para más detalles.");
        } finally {
           
            setIsLoading(false);
        }
    };
    
    const isButtonDisabled = !name.trim() || !idBrand || !idProduct || isLoading || isProductLoading;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre del Sistema</Label>
                <Input id="name" placeholder="Ej: Corrediza Serie 100" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Select value={idBrand} onValueChange={setIdBrand}>
                    <SelectTrigger id="brand"><SelectValue placeholder="Selecciona una marca" /></SelectTrigger>
                    <SelectContent>{brands.map((brand) => (<SelectItem key={brand.id} value={String(brand.id)}>{brand.name}</SelectItem>))}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="product">Producto</Label>
                <Select value={idProduct} onValueChange={setIdProduct} disabled={!idBrand || isProductLoading}>
                    <SelectTrigger id="product"><SelectValue placeholder={isProductLoading ? "Cargando productos..." : (idBrand ? "Selecciona un producto" : "Primero selecciona una marca")} /></SelectTrigger>
                    <SelectContent>{availableProducts.map((product) => (<SelectItem key={product.id} value={String(product.id)}>{product.name}</SelectItem>))}</SelectContent>
                </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button type="submit" variant={params.id ? "blue" : "green"} disabled={isButtonDisabled}>
                    {isLoading || isProductLoading ? "Cargando..." : (params.id ? "Actualizar" : "Crear")}
                </Button>
            </div>
        </form>
    );
}
