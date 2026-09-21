import { requireWarehouseUser } from "./warehouse-access";
import { WarehouseNavigation } from "./warehouse-navigation";

export default async function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWarehouseUser();
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <WarehouseNavigation />
      {children}
    </main>
  );
}
