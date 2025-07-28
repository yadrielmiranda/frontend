import { cookies } from "next/headers";
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

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idString } = await params;
  const id = Number(idString);
  if (isNaN(id)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const [order, statuses] = await Promise.all([
    getOrder(id, token),
    getOrderStatuses(token),
  ]);

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
