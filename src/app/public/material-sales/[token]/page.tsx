import { notFound } from "next/navigation";
import { isApiError } from "@/app/api/_base";
import { publicMaterialSale } from "@/app/api/materials.api";
import { PublicMaterialSaleClient } from "./public-material-sale-client";

export default async function PublicMaterialSalePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<{ payment?: string | string[] }> }) {
  const { token } = await params;
  const payment = (await searchParams)?.payment;
  const paymentReturn = payment === "canceled" || payment === "returned" ? payment : undefined;
  try { return <PublicMaterialSaleClient initial={await publicMaterialSale(token)} token={token} paymentReturn={paymentReturn} />; }
  catch (error) { if (isApiError(error) && [400, 404].includes(error.status)) notFound(); throw error; }
}
