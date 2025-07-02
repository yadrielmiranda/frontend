import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandForm } from "./brand-form";


export default function NewBrand() {
  
  
  
  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
            <CardTitle>
               New Brand
            </CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm/>
        </CardContent>
      </Card>
    </div>
  );
}