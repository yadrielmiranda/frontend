import { notFound } from "next/navigation";
import { requireWarehouseUser } from "../warehouse-access";
import { ExternalPoClient } from "./external-po-client";

export default async function ExternalPoPage() {
  const user = await requireWarehouseUser();
  if (user.role?.name !== "admin") notFound();
  return <ExternalPoClient />;
}
