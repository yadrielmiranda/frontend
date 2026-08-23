// src/app/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { getOrder } from "@/app/api/orders.api";
import { isApiError } from "@/app/api/_base";
import { getCurrentUser } from "@/lib/session";
import { canEditOrders, canViewOrderFinancials, isAdminRole } from "@/lib/rbac";
import { OrderDetails } from "./order-details";
import { getEstimateInstallation } from "@/app/api/installations.api";
import { getGlobalParameters } from "@/app/api/global-parameters.api";

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
  const [installation, parameters] = await Promise.all([
    getEstimateInstallation(order.idEst),
    getGlobalParameters(),
  ]);
  const cardSurchargeFraction = Number(
    parameters.find((parameter) => parameter.key === "CARD_SURCHARGE_PERCENT")
      ?.value ?? 0,
  );

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <OrderDetails
        order={order}
        installation={installation}
        isOwner={user.id === order.userId}
        isPrivileged={canEdit}
        isAdmin={isAdminRole(role)}
        canEdit={canEdit}
        canViewFinancials={canViewFinancials}
        cardSurchargeFraction={cardSurchargeFraction}
        canRecordManualPayment={
          isAdminRole(role) ||
          (role === "dealer" &&
            user.id === order.userId &&
            order.dealerModeSnapshot === "INTERNAL")
        }
      />
    </div>
  );
}
