import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { MuntinPatternForm } from "./muntin-pattern-form";

export default async function NewMuntinPatternPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/muntin-patterns"
          label="Back to Muntin Patterns"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Muntin Pattern</CardTitle>
          <CardDescription>
            Create a new muntin pattern available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <MuntinPatternForm />
        </CardContent>
      </Card>
    </div>
  );
}