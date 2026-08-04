// src/app/settings/(write)/users/new/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/navigation/back-link";
import { getRoles } from "@/app/api/roles.api";
import { UserForm } from "./user-form";
import { getInstallationProfiles } from "@/app/api/installations.api";

export default async function NewUserPage() {
  const [roles, profiles] = await Promise.all([
    getRoles(),
    getInstallationProfiles(false),
  ]);

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink href="/settings/users" label="Back to Users" />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create a New User</CardTitle>
          <CardDescription>
            Fill in the details below to create a new user account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm roles={roles} profiles={profiles} />
        </CardContent>
      </Card>
    </div>
  );
}
