import { requireWarehouseUser } from "../warehouse-access";
import { materialProducts, materialUnits, materialCategories } from "@/app/api/materials.api";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const user = await requireWarehouseUser();
  const [products, units, categories] = await Promise.all([materialProducts(), materialUnits(), materialCategories()]);
  return <MaterialsClient initial={products} initialUnits={units} initialCategories={categories} admin={user.role?.name === "admin"} />;
}
