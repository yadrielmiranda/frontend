import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CrystalForm } from "../../new/crystal-form";
import { getCrystal } from "@/app/api/cristals.api";


export default async function EditCrystalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const crystal = await getCrystal(Number(id));

  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Edit Crystal</CardTitle>
        </CardHeader>
        <CardContent>
          <CrystalForm crystal={crystal} />
        </CardContent>
      </Card>
    </div>
  );
}
