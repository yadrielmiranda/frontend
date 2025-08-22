// src/app/estimates/page.tsx
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getEstimates } from "@/app/api/estimates.api";
import { getCurrentUser } from "@/lib/session"; // Importamos el helper de servidor
import { EstimatesClient } from "./estimateclient";


export default async function EstimatesPage() {
  // 1. Obtenemos el token y el usuario en el servidor
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const user = await getCurrentUser();

  // 2. Obtenemos los estimados (la API ya sabe si devolver todos o solo los del usuario)
  const estimates = await getEstimates(token);

  // Mapeamos el usuario del token a la estructura AuthUser que espera el componente cliente
  const currentUserForClient = user ? {
    id: user.sub,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  } : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Estimates</h1>
        <Button variant="green" asChild>
          <Link href="/estimates/new">+ New Estimate</Link>
        </Button>
      </div>
      <div className="container mx-auto py-10">
        {/* 3. Renderizamos el Componente Cliente, pasándole los datos como props */}
        <EstimatesClient 
          initialEstimates={estimates} 
          currentUser={currentUserForClient} 
        />
      </div>
    </div>
  );
}