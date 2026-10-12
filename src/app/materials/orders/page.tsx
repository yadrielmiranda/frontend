import { notFound, redirect } from "next/navigation";
import { customerMaterialOrders } from "@/app/api/materials.api";
import { getCurrentUser } from "@/lib/session";
import { MaterialOrdersClient } from "./material-orders-client";

export const dynamic = "force-dynamic";

export default async function MaterialOrdersPage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["admin", "operator", "client", "dealer"].includes(user.role?.name)) notFound();
  const params = await props?.searchParams ?? {};
  const requestedPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return <MaterialOrdersClient key={user.id} accountId={user.id} accountRole={user.role.name} initial={await customerMaterialOrders({ page, pageSize: 20 })} />;
}
