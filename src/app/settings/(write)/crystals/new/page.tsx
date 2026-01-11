import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { CrystalForm } from "./crystal-form";
import { BackLink } from "@/components/navigation/back-link";

export default function NewCrystalPage() {
  return (
    <div className="container mx-auto py-10">
      {/* Navigation */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/crystals" label="Back to Crystals" />
      </div>

      {/* Main card */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Crystal</CardTitle>
          <CardDescription>
            Create a new glass option available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <CrystalForm />
        </CardContent>
      </Card>
    </div>
  );
}
