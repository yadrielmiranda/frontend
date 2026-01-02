import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getRoles } from "@/app/api/roles.api";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
  const roles = await getRoles();

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
          <UserForm roles={roles} />
        </CardContent>
      </Card>
    </div>
  );
}
