// src/app/settings/(write)/roles/page.tsx
import { getRoles } from "@/app/api/roles.api";
import { RolesClient } from "./roles-client";

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Roles & Markups</h1>
        {/* No "New" button: roles are fixed */}
      </div>

      <div className="container mx-auto py-10">
        <RolesClient initialRoles={roles} />
      </div>
    </div>
  );
}
