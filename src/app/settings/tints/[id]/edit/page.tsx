import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TintForm } from "../../new/tint-form";
import { getTint } from "@/app/api/tints.api";

export default async function EditTintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tint = await getTint(Number(id));

  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Edit Tint</CardTitle>
        </CardHeader>
        <CardContent>
          <TintForm tint={tint} />
        </CardContent>
      </Card>
    </div>
  );
}
