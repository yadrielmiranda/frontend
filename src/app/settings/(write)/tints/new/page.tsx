import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { TintForm } from "./tint-form";
import { BackLink } from "@/components/navigation/back-link";

export default function NewTintPage() {
  return (
    <div className="container mx-auto py-10">
      {/* Navigation */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/tints" label="Back to Tints" />
      </div>

      {/* Main card */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Tint</CardTitle>
          <CardDescription>
            Create a new tint available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <TintForm />
        </CardContent>
      </Card>
    </div>
  );
}
