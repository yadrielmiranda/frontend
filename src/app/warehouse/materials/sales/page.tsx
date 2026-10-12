import { requireWarehouseUser } from "../../warehouse-access";
import { materialSales, materialCatalog } from "@/app/api/materials.api";
import { warehouseStores } from "@/app/api/warehouse.api";
import { MaterialSalesClient } from "../material-sales-client";

async function staffSalesCatalog() {
  const first = await materialCatalog({ pageSize: 100 });
  const products = [...first.products];
  for (let page = 2; page <= Math.ceil(first.total / first.pageSize); page++) {
    products.push(...(await materialCatalog({ pageSize: first.pageSize, page })).products);
  }
  return { ...first, products };
}

export default async function MaterialSalesPage() {
  await requireWarehouseUser();
  const [sales, catalog, stores] = await Promise.all([materialSales(), staffSalesCatalog(), warehouseStores()]);
  return <MaterialSalesClient initial={sales} catalog={catalog} stores={stores} />;
}
