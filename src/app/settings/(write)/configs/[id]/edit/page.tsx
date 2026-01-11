import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getConfig } from "@/app/api/configs.api";
import { getProducts } from "@/app/api/products.api";
import { ConfigForm } from "../../new/config-form";

export default async function EditConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const configId = Number(id);

  if (Number.isNaN(configId)) notFound();

  const [config, products] = await Promise.all([
    getConfig(configId),
    getProducts(),
  ]);

  if (!config) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Config</CardTitle>
            <CardDescription>Update the configuration.</CardDescription>
          </CardHeader>

          <CardContent>
            <ConfigForm config={config} products={products} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
