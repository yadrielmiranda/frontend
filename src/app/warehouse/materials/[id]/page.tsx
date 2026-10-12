import { notFound } from "next/navigation";
import { requireWarehouseUser } from "../../warehouse-access";
import { materialProduct, materialUnits, materialCategories } from "@/app/api/materials.api";
import { warehouseStores } from "@/app/api/warehouse.api";
import { MaterialDetailClient } from "../material-detail-client";
import { isApiError } from "@/app/api/_base";

export default async function MaterialDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ presentation?: string }> }) {
  const user = await requireWarehouseUser();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  try {
    const [product, units, stores, categories] = await Promise.all([materialProduct(Number(id)), materialUnits(), warehouseStores(), materialCategories()]);
    const selected = Number((await searchParams).presentation);
    return <MaterialDetailClient initial={product} units={units} stores={stores} initialCategories={categories} admin={user.role?.name === "admin"} scannedPresentationId={product.presentations.some(p => p.id === selected) ? selected : undefined} />;
  } catch (error) { if (isApiError(error) && error.status === 404) notFound(); throw error; }
}
