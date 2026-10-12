import { notFound, redirect } from "next/navigation";
import { materialCatalog, type MaterialCatalogQuery } from "@/app/api/materials.api";
import { getCurrentUser } from "@/lib/session";
import { warehouseStores } from "@/app/api/warehouse.api";
import { MaterialsCatalogClient } from "./materials-catalog-client";

export const dynamic = "force-dynamic";
export default async function MaterialsCatalogPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["admin", "operator", "client", "dealer"].includes(user.role?.name)) notFound();
  const params = await props?.searchParams ?? {};
  const value = (name: string) => typeof params[name] === "string" ? params[name] as string : undefined;
  const positiveId = (name: string) => {
    const raw = value(name);
    const parsed = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  };
  const initialQuery: MaterialCatalogQuery = {
    q: value("q")?.trim().slice(0, 200) || undefined,
    categoryId: positiveId("categoryId"), brand: value("brand")?.slice(0, 120) || undefined,
    inStock: value("inStock") === "true" || undefined,
    sort: value("sort") === "name-desc" ? "name-desc" : "name-asc",
    page: positiveId("page") ?? 1, pageSize: 24,
  };
  const isStaff = ["admin", "operator"].includes(user.role.name);
  const [catalog, stores] = await Promise.all([
    materialCatalog(initialQuery),
    isStaff ? warehouseStores() : Promise.resolve([]),
  ]);
  return <MaterialsCatalogClient key={`${user.id}:${user.role.name}`} viewer={{ id: user.id, role: user.role.name }} initial={catalog} initialQuery={initialQuery} stores={stores.filter(store => store.isActive)} />;
}
