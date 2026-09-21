import { requireWarehouseUser } from "../warehouse-access";
import { warehouseHistory } from "@/app/api/warehouse.api";
import { HistoryClient } from "./history-client";
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ lineNumber?: string }>;
}) {
  await requireWarehouseUser();
  const { lineNumber } = await searchParams;
  const line =
    typeof lineNumber === "string" && /^[Ii]?\d{1,50}$/.test(lineNumber)
      ? lineNumber
      : "";
  return (
    <HistoryClient
      initial={await warehouseHistory({ lineNumber: line || undefined })}
      lineNumber={line}
    />
  );
}
