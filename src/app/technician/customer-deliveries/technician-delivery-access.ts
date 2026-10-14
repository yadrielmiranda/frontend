import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export async function requireTechnicianDeliveryUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/technician");
  if (user.role?.name !== "technician") notFound();
  return user;
}
