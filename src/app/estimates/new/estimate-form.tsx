"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createEstimate } from "@/app/api/estimates.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

// El tipo de los datos maestros que recibe el formulario
type MasterData = {
    products: any[];
    brands: any[];
    systems: any[];
    configs: any[];
    frameColors: any[];
    crystals: any[];
    tints: any[];
    coatings: any[];
};

// El tipo de los valores del formulario
type FormValues = {
    number: string;
    name: string;
    project: string;
    pieces: {
        mark: string;
        idProd: string;
        idBrand: string;
        idSyst: string;
        idConf: string;
        idFC: string;
        width: string;
        height: string;
        idCryst: string;
        idTint: string;
        idCoat: string;
        qty: number;
        privacy: boolean;
        screen: boolean;
        muntin: boolean;
    }[];
};

export function EstimateForm({ masterData }: { masterData: MasterData }) {
    const router = useRouter();
    const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
        defaultValues: {
            number: "",
            name: "",
            project: "",
            pieces: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "pieces",
    });

    const onSubmit = async (data: FormValues) => {
        // Convertimos los IDs de string a number antes de enviar
        const payload = {
            ...data,
            idUser: 1, // Debes obtener el ID del usuario logueado
            pieces: data.pieces.map(p => ({
                ...p,
                idProd: Number(p.idProd),
                idBrand: Number(p.idBrand),
                idSyst: Number(p.idSyst),
                idConf: Number(p.idConf),
                idFC: Number(p.idFC),
                idCryst: Number(p.idCryst),
                idTint: Number(p.idTint),
                idCoat: Number(p.idCoat),
            })),
        };

        try {
            await createEstimate(payload);
            toast.success("Presupuesto creado exitosamente.");
            router.push("/settings/estimates");
        } catch (error: any) {
            toast.error(error.message || "Error al crear el presupuesto.");
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Cabecera del Presupuesto */}
            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <Label>Número de Presupuesto</Label>
                    <Input {...register("number", { required: true })} />
                </div>
                <div>
                    <Label>Nombre de Cliente</Label>
                    <Input {...register("name", { required: true })} />
                </div>
                <div>
                    <Label>Nombre de Proyecto</Label>
                    <Input {...register("project", { required: true })} />
                </div>
            </div>

            {/* Piezas del Presupuesto */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold">Piezas</h3>
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                         <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid md:grid-cols-4 gap-4">
                            <div>
                                <Label>Marca (Item)</Label>
                                <Input {...register(`pieces.${index}.mark`, { required: true })} />
                            </div>
                            <div>
                                <Label>Producto</Label>
                                <Controller name={`pieces.${index}.idProd`} control={control} rules={{ required: true }} render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{masterData.products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                )}/>
                            </div>
                             {/* ... Repite el patrón de <Controller> para todos los demás <Select> ... */}
                             {/* idBrand, idSyst, idConf, idFC, etc. */}
                             <div>
                                <Label>Ancho</Label>
                                <Input {...register(`pieces.${index}.width`, { required: true })} />
                            </div>
                             <div>
                                <Label>Alto</Label>
                                <Input {...register(`pieces.${index}.height`, { required: true })} />
                            </div>
                             <div>
                                <Label>Cantidad</Label>
                                <Input type="number" {...register(`pieces.${index}.qty`, { required: true, valueAsNumber: true })} />
                            </div>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ 
                    mark: "", idProd: "", idBrand: "", idSyst: "", idConf: "", idFC: "", width: "", height: "", idCryst: "", idTint: "", idCoat: "", qty: 1, privacy: false, screen: false, muntin: false 
                })}>
                    Añadir Pieza
                </Button>
            </div>

            <div className="flex justify-end pt-8">
                <Button type="submit" disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Guardando..." : "Crear Presupuesto"}
                </Button>
            </div>
        </form>
    );
}