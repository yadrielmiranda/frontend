import { requireWarehouseUser } from "../../warehouse-access";
import { materialHistory } from "@/app/api/materials.api";
import { warehouseStores } from "@/app/api/warehouse.api";
import { MaterialHistoryClient } from "./material-history-client";

export default async function MaterialHistoryPage() {
  await requireWarehouseUser();
  const [history, stores] = await Promise.all([materialHistory(), warehouseStores()]);
  return <MaterialHistoryClient initial={history} stores={stores} />;
}
