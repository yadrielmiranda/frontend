import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { SystemForm } from "./system-form";
import { getBrands } from "@/app/api/brands.api";

export default async function NewSystemPage() {
  const brands = await getBrands();

  return (
    <div className="container mx-auto py-10">
      {/* Navegación */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/systems" label="Back to Systems" />
      </div>

      {/* Card principal */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New System</CardTitle>
          <CardDescription>
            Create a new system available in the catalog.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SystemForm brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
