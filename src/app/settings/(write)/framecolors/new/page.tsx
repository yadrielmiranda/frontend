import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FcolorForm } from "./fcolor-form";




//const product = await getProduct(params.id);

export default function NewFcolor() {
  
  
  
  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
            <CardTitle>
               New Color
            </CardTitle>
        </CardHeader>
        <CardContent>
          <FcolorForm/>
        </CardContent>
      </Card>
    </div>
  );
}