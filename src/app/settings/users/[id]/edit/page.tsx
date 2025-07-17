import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUser } from "@/app/api/users.api";
import { getRoles } from "@/app/api/roles.api";
import { UserForm } from "../../new/user-form";

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
          <CardTitle className="text-2xl">Cambiar Rol para: {user.username}</CardTitle>
          <CardDescription>
            Utiliza el siguiente campo para asignar un nuevo rol a este usuario. El resto de la información es solo de lectura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm user={user} roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
