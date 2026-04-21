import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { ActiveOptionForm } from "./active-option-form";

export default function NewActiveOptionPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/active-options"
          label="Back to Active Options"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Active Option</CardTitle>
          <CardDescription>
            Create a new active option available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ActiveOptionForm />
        </CardContent>
      </Card>
    </div>
  );
}