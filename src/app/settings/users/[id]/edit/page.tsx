import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser } from "@/app/api/users.api";
import { getRoles } from "@/app/api/roles.api";
import { UserForm } from "../../new/user-form";



// ✅ CORRECCIÓN: Se actualiza la firma para manejar los params como una promesa.
export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ Se añade 'await' para resolver la promesa de los params.
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) {
    notFound();
  }
  
  // Se obtiene el token para las llamadas desde el servidor.
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // Obtenemos los datos del usuario y la lista de roles en paralelo para mayor eficiencia
  const [user, roles] = await Promise.all([
    getUser(userId, token), // Se pasa el token
    getRoles(token)       // Se pasa el token
  ]);

  // Si el usuario no existe, mostramos la página 404
  if (!user) {
    notFound();
  }

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Edit User: {user.username}</CardTitle>
          <CardDescription>
            Update the details for this user account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Le pasamos el usuario y los roles al formulario para que entre en modo edición */}
          <UserForm user={user} roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
