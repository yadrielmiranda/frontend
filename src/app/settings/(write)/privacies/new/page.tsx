import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PrivacyForm } from "./privacy-form";

export default function NewPrivacyPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>New Privacy Option</CardTitle>
            <CardDescription>
              Create an option that can be associated with Brands.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrivacyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
