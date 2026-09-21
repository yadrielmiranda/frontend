import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canAccessWarehouse } from "@/lib/rbac";

export async function requireWarehouseUser() {
  const user = await getCurrentUser();
  if (!user || !canAccessWarehouse(user.role?.name)) notFound();
  return user;
}
