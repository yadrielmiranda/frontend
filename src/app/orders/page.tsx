import { cookies } from "next/headers";
import { getOrders } from "@/app/api/orders.api";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns-orders";


export default async function OrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  const orders = await getOrders(token);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Orders</h1>
        {/* No hay botón de "New" ya que se crean desde los estimados */}
      </div>
      <div className="container mx-auto py-10">
        <DataTable
          columns={columns}
          data={orders}
          filterColumnId="number"
          filterPlaceholder="Filter by order number..."
        />
      </div>
    </div>
  );
}