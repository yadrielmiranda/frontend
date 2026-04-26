import { getOrders } from "@/app/api/orders.api";
import { getCurrentUser } from "@/lib/session";
import { OrdersClient } from "./orders-client";
import { canEditOrders } from "@/lib/rbac";
import { notFound } from "next/navigation";

export default async function OrdersPage() {

  const user = await getCurrentUser();
  if (!user) notFound();
  
  
  const role = user.role?.name ?? null;  
  const canEdit = canEditOrders(role);
  const orders = await getOrders();

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage orders.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <OrdersClient initialOrders={orders} canEdit={canEdit} />
      </div>
    </div>
  );
}
