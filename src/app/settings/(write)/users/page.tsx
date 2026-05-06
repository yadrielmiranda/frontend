// src/app/settings/(write)/users/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUsers } from "@/app/api/users.api";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: {
    showDeleted?: string;
  };
}) {
  const showDeleted = searchParams?.showDeleted === "true";

  const users = await getUsers(showDeleted);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">User Management</h1>

          <p className="text-sm text-muted-foreground mt-1">
            {showDeleted
              ? "Showing active, inactive, and deleted users."
              : "Showing active and inactive users only."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link
              href={
                showDeleted
                  ? "/settings/users"
                  : "/settings/users?showDeleted=true"
              }
            >
              {showDeleted ? "Hide Deleted" : "Show Deleted"}
            </Link>
          </Button>

          <Button asChild>
            <Link href="/settings/users/new">+ New User</Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto py-10">
        <UsersClient initialUsers={users} />
      </div>
    </div>
  );
}