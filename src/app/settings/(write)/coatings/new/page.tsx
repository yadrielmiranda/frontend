import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { CoatingForm } from "./coating-form";
import { BackLink } from "@/components/navigation/back-link";

export default function NewCoatingPage() {
  return (
    <div className="container mx-auto py-10">
      {/* Navegación */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/coatings" label="Back to Coatings" />
      </div>

      {/* Card principal */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Coating</CardTitle>
          <CardDescription>
            Create a new coating available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <CoatingForm />
        </CardContent>
      </Card>
    </div>
  );
}
