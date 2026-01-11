import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { FcolorForm } from "./fcolor-form";
import { BackLink } from "@/components/navigation/back-link";

export default function NewFrameColorPage() {
  return (
    <div className="container mx-auto py-10">
      {/* Navigation */}
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/framecolors" label="Back to Frame Colors" />
      </div>

      {/* Main card */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>New Frame Color</CardTitle>
          <CardDescription>
            Create a new frame color option available in the system.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FcolorForm />
        </CardContent>
      </Card>
    </div>
  );
}
