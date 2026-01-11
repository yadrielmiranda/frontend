import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { getProducts } from "@/app/api/products.api";
import { ConfigForm } from "./config-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function NewConfigPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto py-10">
      {/* Navegación */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/configs" label="Back to Configs" />
      </div>

      {/* Card principal */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Config</CardTitle>
          <CardDescription>
            Create a new configuration available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ConfigForm products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
