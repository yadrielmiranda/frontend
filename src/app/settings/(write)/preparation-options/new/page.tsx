import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { PreparationOptionForm } from "./preparation-option-form";

export default function NewPreparationOptionPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/preparation-options"
          label="Back to Preparation Options"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Preparation Option</CardTitle>
          <CardDescription>
            Create a new preparation option available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <PreparationOptionForm />
        </CardContent>
      </Card>
    </div>
  );
}