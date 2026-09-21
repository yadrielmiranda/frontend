import { requireWarehouseUser } from "../warehouse-access";
import { warehouseCounts, warehouseStores } from "@/app/api/warehouse.api";
import { CountsClient } from "./counts-client";
export default async function CountsPage() {
  await requireWarehouseUser();
  const [counts, stores] = await Promise.all([warehouseCounts(), warehouseStores()]);
  return <CountsClient initial={counts} initialStores={stores} />;
}
