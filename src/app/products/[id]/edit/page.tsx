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

/*

//de esta forma tambien se puede hacer, pero necesitaba Promise en esta funcion para usar el await

interface Props{
  params: { 
    id: string;
  }

  
}
*/

export default async function EditProduct({params}: { params: Promise<{ id: string }> }) {
  const {id} = await params; //si es necesario el await
  const product =  await getProduct(id);
  console.log("este es el producto desde edit");
  
  console.log(product);
  console.log("arribaaaaaaa");
  
  
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