import { getDesignColors, getDesignPatterns } from "@/app/api/garage-designs.api";
import { getFColors } from "@/app/api/fcolors.api";
import { BackLink } from "@/components/navigation/back-link";
import { GarageDesignCatalogsClient } from "./garage-design-catalogs-client";

export default async function GarageDesignCatalogsPage() {
  const [patterns, colors, frameColors] = await Promise.all([getDesignPatterns(), getDesignColors(), getFColors()]);
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-10">
      <BackLink href="/settings" label="Back to Settings" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garage Design Catalogs</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create colors and designs, then choose their availability and defaults in each system’s Manage Designs page.</p>
      </div>
      <GarageDesignCatalogsClient initialPatterns={patterns} initialColors={colors} frameColors={frameColors} />
    </div>
  );
}
