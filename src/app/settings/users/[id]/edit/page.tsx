// src/app/settings/users/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser } from "@/app/api/users.api";
import { getRoles } from "@/app/api/roles.api";
// --- INICIO DE LA CORRECCIÓN ---
// Se corrige la ruta de importación para apuntar al formulario unificado que ya tienes.
import { UserForm } from "../../new/user-form"; 
// --- FIN DE LA CORRECCIÓN ---

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) {
    notFound();
  }
  
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value; 

  const [user, roles] = await Promise.all([
    getUser(userId, token),
    getRoles(token)
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Edit User: {user.username}</CardTitle>
          <CardDescription>
            Update the role or set a custom markup for this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Ahora se usa el componente UserForm correctamente, pasándole las props necesarias */}
          <UserForm user={user} roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
