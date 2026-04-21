import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { SillOptionForm } from "./sill-option-form";

export default function NewSillOptionPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/sill-options" label="Back to Sill Options" />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Sill Option</CardTitle>
          <CardDescription>
            Create a new sill option available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SillOptionForm />
        </CardContent>
      </Card>
    </div>
  );
}