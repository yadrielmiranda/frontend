import { getDoorDesignCatalog } from "@/app/api/door-designs.api";
import { BackLink } from "@/components/navigation/back-link";
import { DoorDesignCatalog } from "./door-design-catalog";

export default async function FrenchDoorDesignsPage() {
  const designs = await getDoorDesignCatalog();
  return <main className="container mx-auto max-w-5xl space-y-5 py-10">
    <BackLink href="/settings" label="Back to Settings" />
    <h1 className="text-2xl font-bold tracking-tight">French Door Designs</h1>
    <p className="text-sm text-muted-foreground">Set a code and a fixed price per door. Enable door designs in Settings → Systems to offer priced designs for matching single or double doors.</p>
    <DoorDesignCatalog designs={designs} />
  </main>;
}
