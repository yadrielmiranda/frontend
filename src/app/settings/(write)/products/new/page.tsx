import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { ProductForm } from "./product-form";
import { BackLink } from "@/components/navigation/back-link";

export default function NewProductPage() {
  return (
    <div className="container mx-auto py-10">
      {/* Navigation */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/products" label="Back to Products" />
      </div>

      {/* Main card */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Product</CardTitle>
          <CardDescription>
            Create a new product available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>
    </div>
  );
}
