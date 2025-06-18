import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductForm } from "../../new/product-form";
import { getProduct } from "@/queries/products.api";

interface Props {
  params: {
    id: string;
  }
}

//const product = await getProduct(params.id);

export default async function EditProduct({params}: Props) {
  const {id} = params;
  const product =  await getProduct(id);
  console.log(product);
  
  
  return (
    <div className="h-screen flex justify-center items-center">
      <Card>
        <CardHeader>
            <CardTitle>
               Edit Product
            </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm product = {product}/>
        </CardContent>
      </Card>
    </div>
  );
}