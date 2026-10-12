import { notFound } from "next/navigation";
import { requireWarehouseUser } from "../../../warehouse-access";
import { materialSale } from "@/app/api/materials.api";
import { isApiError } from "@/app/api/_base";
import { MaterialSaleClient } from "../../material-sale-client";

export default async function MaterialSalePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWarehouseUser();
  const { id } = await params; if (!/^\d+$/.test(id)) notFound();
  try { return <MaterialSaleClient initial={await materialSale(Number(id))} admin={user.role?.name === "admin"} />; }
  catch (error) { if (isApiError(error) && error.status === 404) notFound(); throw error; }
}
