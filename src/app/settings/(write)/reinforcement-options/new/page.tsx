import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { BackLink } from "@/components/navigation/back-link";
import { ReinforcementOptionForm } from "./reinforcement-option-form";

export default function NewReinforcementOptionPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/reinforcement-options"
          label="Back to Reinforcement Options"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Reinforcement Option</CardTitle>
          <CardDescription>
            Create a new reinforcement option available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ReinforcementOptionForm />
        </CardContent>
      </Card>
    </div>
  );
}