import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { getRoles } from "@/app/api/roles.api";
import { cookies } from "next/headers";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
  // Se obtiene el token para autenticar la llamada a la API
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  
  // Se obtienen los roles disponibles desde el backend
  const roles = await getRoles(token);

  return (
    <div className="flex justify-center items-start py-10 px-4 min-h-screen bg-gray-50">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create a New User</CardTitle>
          <CardDescription>
            Fill in the details below to create a new user account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Se renderiza el formulario, pasándole solo los roles */}
          <UserForm roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
