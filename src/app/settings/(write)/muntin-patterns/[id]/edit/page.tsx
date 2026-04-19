import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getMuntinPattern } from "@/app/api/muntin-patterns.api";
import { BackLink } from "@/components/navigation/back-link";
import { MuntinPatternForm } from "../../new/muntin-pattern-form";

export default async function EditMuntinPatternPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patternId = Number(id);

  if (Number.isNaN(patternId)) notFound();

  const pattern = await getMuntinPattern(patternId);

  if (!pattern) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/muntin-patterns"
          label="Back to Muntin Patterns"
        />
      </div>

      <div className="max-w-lg mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Muntin Pattern</CardTitle>
            <CardDescription>Update the muntin pattern.</CardDescription>
          </CardHeader>

          <CardContent>
            <MuntinPatternForm pattern={pattern} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}