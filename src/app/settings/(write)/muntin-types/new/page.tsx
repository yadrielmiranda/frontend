import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { MuntinTypeForm } from "./muntin-type-form";

export default async function NewMuntinTypePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/muntin-types" label="Back to Muntin Types" />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Muntin Type</CardTitle>
          <CardDescription>
            Create a new muntin type available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <MuntinTypeForm />
        </CardContent>
      </Card>
    </div>
  );
}