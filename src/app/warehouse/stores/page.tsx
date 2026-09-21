import { requireWarehouseUser } from "../warehouse-access";
import { warehouseStores } from "@/app/api/warehouse.api";
import { StoresClient } from "./stores-client";
export default async function StoresPage() {
  const user = await requireWarehouseUser();
  return <StoresClient initial={await warehouseStores()} admin={user?.role?.name === "admin"} />;
}
