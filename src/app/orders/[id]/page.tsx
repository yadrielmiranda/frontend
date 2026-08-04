// src/app/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { getOrder } from "@/app/api/orders.api";
import { isApiError } from "@/app/api/_base";
import { getCurrentUser } from "@/lib/session";
import { canEditOrders, canViewOrderFinancials } from "@/lib/rbac";
import { OrderDetails } from "./order-details";
import { getEstimateInstallation } from "@/app/api/installations.api";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { id: idString } = await params;
  const id = Number(idString);
  if (Number.isNaN(id)) notFound();

  const role = user.role?.name ?? null;
  const canEdit = canEditOrders(role);
  const canViewFinancials = canViewOrderFinancials(role);

  let order;
  try {
    order = await getOrder(id);
  } catch (e) {
    if (isApiError(e)) {
      // 403/404 => para cliente/dealer mostramos 404 para no revelar
      if (e.status === 403 || e.status === 404) notFound();
    }
    throw e;
  }

  if (!order) notFound();
  const installation = await getEstimateInstallation(order.idEst);

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <OrderDetails
        order={order}
        installation={installation}
        isOwner={user.id === order.userId}
        isPrivileged={canEdit}
        canEdit={canEdit}
        canViewFinancials={canViewFinancials}
      />
    </div>
  );
}
