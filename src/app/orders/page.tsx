import { getOrders } from "@/app/api/orders.api";
import { getCurrentUser } from "@/lib/session";
import { OrdersClient } from "./orders-client";
import { canEditOrders, canViewOrderFinancials } from "@/lib/rbac";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Landmark } from "lucide-react";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ po?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const role = user.role?.name ?? null;
  const canEdit = canEditOrders(role);
  const canViewFinancials = canViewOrderFinancials(role);
  const { po } = await searchParams;
  const initialPoFilter = canViewFinancials && ["pending", "missing", "assigned"].includes(po ?? "")
    ? po
    : undefined;
  const orders = await getOrders();

  return (
    <div className="w-full px-4 md:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage orders.
          </p>
        </div>
        {role === "admin" && <Button asChild variant="outline">
          <Link href="/orders/factory-payments"><Landmark aria-hidden="true" />Factory Payments</Link>
        </Button>}
      </div>

      <div className="rounded-xl border bg-white shadow-sm p-4">
        <OrdersClient
          key={`${user.id}:${role}:${initialPoFilter ?? "all"}`}
          initialOrders={orders}
          currentUserId={user.id}
          currentUserRole={role}
          canEdit={canEdit}
          canViewFinancials={canViewFinancials}
          initialPoFilter={initialPoFilter}
        />
      </div>
    </div>
  );
}
