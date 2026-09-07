import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getPromotions, getPromotionOptions } from "@/app/api/promotions.api";
import { PromotionsManager } from "@/components/promotions/promotions-manager";
export default async function PromotionsPage() {
  const user = await getCurrentUser();
  if (user?.role.name !== "admin") notFound();
  const [promotions, options] = await Promise.all([
    getPromotions(),
    getPromotionOptions(),
  ]);
  return <PromotionsManager initial={promotions} options={options} />;
}
