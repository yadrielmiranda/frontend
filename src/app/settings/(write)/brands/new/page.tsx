// src/app/settings/brands/new/page.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BrandForm } from "./brand-form";
import { BackLink } from "@/components/navigation/back-link";

export default function NewBrand() {
  return (
    <div className="container mx-auto py-10">
      {/* Navegación */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/brands" label="Back to Brands" />
      </div>

      {/* Card principal */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Brand</CardTitle>
          <CardDescription>
            Create a new brand available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <BrandForm />
        </CardContent>
      </Card>
    </div>
  );
}
