import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CrystalForm } from "./crystal-form";


export default function NewCrystalPage() {
  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>New Crystal</CardTitle>
        </CardHeader>
        <CardContent>
          <CrystalForm />
        </CardContent>
      </Card>
    </div>
  );
}