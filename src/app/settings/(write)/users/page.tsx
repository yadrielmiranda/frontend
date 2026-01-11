// src/app/settings/(write)/users/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUsers } from "@/app/api/users.api";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">User Management</h1>

        <Button asChild>
          <Link href="/settings/users/new">+ New User</Link>
        </Button>
      </div>

      <div className="container mx-auto py-10">
        <UsersClient initialUsers={users} />
      </div>
    </div>
  );
}
