import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CoatingForm } from "../../new/coating-form";
import { getCoating } from "@/app/api/coatings.api";

export default async function EditCoatingPage({
  params,
}: {
  // Correctamente tipado como una Promesa para Next.js 15+
  params: Promise<{ id: string }>;
}) {
  // Se utiliza await para resolver la promesa y obtener el id
  const { id } = await params;
  const coating = await getCoating(Number(id));

  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Edit Coating</CardTitle>
        </CardHeader>
        <CardContent>
          <CoatingForm coating={coating} />
        </CardContent>
      </Card>
    </div>
  );
}
