import { notFound } from "next/navigation";

import { getPrivacy } from "@/app/api/privacies.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PrivacyForm } from "../../new/privacy-form";

export default async function EditPrivacyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const privacyId = Number(id);

  if (!Number.isInteger(privacyId) || privacyId <= 0) notFound();

  const privacy = await getPrivacy(privacyId);
  if (!privacy) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Privacy Option</CardTitle>
            <CardDescription>
              Update the Privacy option name or status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrivacyForm privacy={privacy} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
