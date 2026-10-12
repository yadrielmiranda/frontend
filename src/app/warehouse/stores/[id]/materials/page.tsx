import { notFound } from "next/navigation";
import { requireWarehouseUser } from "../../../warehouse-access";
import { materialStoreCountInventory } from "@/app/api/materials.api";
import { isApiError } from "@/app/api/_base";
import { MaterialStoreInventoryClient } from "../../material-store-inventory-client";

export default async function MaterialStoreInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWarehouseUser();
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) notFound();
  try {
    return <MaterialStoreInventoryClient key={`${id}:${user.id}:${user.role?.name}`} initial={await materialStoreCountInventory(Number(id))} initialIdentity={{ id: user.id, role: user.role?.name ?? "" }} />;
  } catch (error) { if (isApiError(error) && error.status === 404) notFound(); throw error; }
}
