import { getEnergyCatalogOptions, getEnergyRatings } from "@/app/api/energy-ratings.api";
import { canEditSettings } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { EnergyRatingsClient } from "./energy-ratings-client";

export default async function EnergyRatingsPage() {
  const [ratings, options, user] = await Promise.all([
    getEnergyRatings(),
    getEnergyCatalogOptions(),
    getCurrentUser(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl py-10">
      <h1 className="text-4xl font-bold">Energy Ratings</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        U-factor, SHGC and VLT for each system and glass combination. Saved estimates keep their captured values until explicitly updated.
      </p>
      <EnergyRatingsClient initialRatings={ratings} options={options} canEdit={canEditSettings(user?.role?.name)} />
    </div>
  );
}
