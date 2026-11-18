import { Suspense } from "react";
import { requireWarehouseUser } from "./warehouse-access";
import { WarehouseNavigation } from "./warehouse-navigation";

export default async function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireWarehouseUser();
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Suspense fallback={null}>
        <WarehouseNavigation isAdmin={user.role?.name === "admin"} />
      </Suspense>
      {children}
    </main>
  );
}
