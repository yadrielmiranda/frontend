import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CoatingForm } from "./coating-form"; // CAMBIO

export default function NewCoatingPage() { // CAMBIO
  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>New Coating</CardTitle> {/* CAMBIO */}
        </CardHeader>
        <CardContent>
          <CoatingForm /> {/* CAMBIO */}
        </CardContent>
      </Card>
    </div>
  );
}