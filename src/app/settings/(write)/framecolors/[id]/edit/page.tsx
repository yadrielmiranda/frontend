import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FcolorForm } from "../../new/fcolor-form";
import { getFColor } from "@/app/api/fcolors.api";



export default async function EditFcolor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; //si es necesario el await
  const fcolor = await getFColor(Number(id));

  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>Edit Color</CardTitle>
        </CardHeader>
        <CardContent>
          <FcolorForm fcolor={fcolor} />
        </CardContent>
      </Card>
    </div>
  );
}
