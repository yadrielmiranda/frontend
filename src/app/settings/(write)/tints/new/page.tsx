import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TintForm } from "./tint-form";


export default function NewTintPage() {
  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
          <CardTitle>New Tint</CardTitle>
        </CardHeader>
        <CardContent>
          <TintForm />
        </CardContent>
      </Card>
    </div>
  );
}
