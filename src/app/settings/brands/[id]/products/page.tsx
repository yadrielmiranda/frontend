import { getBrandWithProducts } from "@/app/api/brands.api";
import { getProducts } from "@/app/api/products.api";
import { BrandProductsClient } from "./brand-products-client";

export default async function BrandProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);

  // Obtenemos la marca y sus productos asociados
  const brandData = await getBrandWithProducts(brandId);

  // Obtenemos TODOS los productos para poder añadirlos
  const allProducts = await getProducts();

  if (!brandData) {
    return <div>Marca no encontrada.</div>;
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">       
        <span className="text-blue-600">{brandData.name}</span>
      </h1>
      <div className="container mx-auto py-10">
        {/* Pasamos los datos al componente cliente */}
        <BrandProductsClient
          brandId={brandId}
          initialAssociatedProducts={brandData.brandProducts || []}
          allProducts={allProducts}
        />
      </div>
    </div>
  );
}
