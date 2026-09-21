import { requireWarehouseUser } from "../warehouse-access";
import { warehouseCounts } from "@/app/api/warehouse.api";
import { CountsClient } from "./counts-client";
export default async function CountsPage() {
  await requireWarehouseUser();
  return <CountsClient initial={await warehouseCounts()} />;
}
