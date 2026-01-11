// src/app/orders/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getOrder, getOrderStatuses } from "@/app/api/orders.api";
import { OrderForm } from "./order-form";
import { isApiError } from "@/app/api/_base";
import { getCurrentUser } from "@/lib/session";
import { canEditOrders } from "@/lib/rbac";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound(); //si no existe usuario auntenticado, 404

  const { id: idString } = await params;
  const id = Number(idString);
  if (Number.isNaN(id)) notFound();

  // 🔒 SOLO admin/operator pueden editar órdenes
  const role = user.role?.name ?? null;
  const canEdit = canEditOrders(role);

  if (!canEdit) notFound();

  let order;
  let statuses;

  try {
    [order, statuses] = await Promise.all([getOrder(id), getOrderStatuses()]);
  } catch (e) {
    if (isApiError(e)) {
      if (e.status === 403 || e.status === 404) {
        notFound(); // cliente NO debe saber que existe
      }
    }
    throw e; // 500, etc.
  }

  if (!order) notFound();

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Edit Order #{order.number}</CardTitle>
          <CardDescription>Update the status for this order.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrderForm order={order} statuses={statuses} />
        </CardContent>
      </Card>
    </div>
  );
}
