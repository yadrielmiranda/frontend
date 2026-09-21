import { notFound } from "next/navigation";
import { requireWarehouseUser } from "../../warehouse-access";
import { warehouseCount } from "@/app/api/warehouse.api";
import { isApiError } from "@/app/api/_base";
import { CountClient } from "./count-client";
export default async function CountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireWarehouseUser();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const initial = await warehouseCount(id).catch((e) => {
    if (isApiError(e) && e.status === 404) notFound();
    throw e;
  });
  return (
    <CountClient
      initial={initial}
      admin={user?.role?.name === "admin"}
      actorId={user!.id}
    />
  );
}
