// src/app/settings/(write)/users/columns-users.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  KeyRound,
  MoreHorizontal,
  Trash2,
  UserCog,
  Star,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

import type { User } from "@/lib/types";
import { deleteUser, setUserActive } from "@/app/api/users.api";

export const columns: ColumnDef<User>[] = [
  { accessorKey: "username", header: "Username" },
  { accessorKey: "firstName", header: "First Name" },
  { accessorKey: "lastName", header: "Last Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "role.name",
    header: "Role",
    cell: ({ row }) => {
      const roleName = row.original.role.name;

      return (
        <span
          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
            roleName === "admin"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {roleName}
        </span>
      );
    },
  },
  {
    accessorKey: "markupOverride",
    header: "Custom Markup",
    cell: ({ row }) => {
      const user = row.original;

      if (user.markupOverride !== null && user.markupOverride !== undefined) {
        return (
          <div className="flex items-center gap-1 font-semibold text-blue-600">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            <span>{(user.markupOverride * 100).toFixed(2)}%</span>
          </div>
        );
      }

      return <span className="text-gray-400 italic">Default</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.isActive;

      return (
        <span
          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const u = row.original;
      const router = useRouter();

      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const [showActiveConfirm, setShowActiveConfirm] = useState(false);

      const nextIsActive = !u.isActive;
      const activeActionLabel = u.isActive
        ? "Deactivate User"
        : "Activate User";

      const handleToggleActive = async () => {
        try {
          await setUserActive(u.id, nextIsActive);
          toast.success(u.isActive ? "User deactivated." : "User activated.");
          router.refresh();
        } catch (err: any) {
          toast.error(err?.message || "Update failed");
        } finally {
          setShowActiveConfirm(false);
        }
      };

      const handleDelete = async () => {
        try {
          await deleteUser(u.id);
          toast.success("User deleted successfully.");
          router.refresh();
        } catch (err: any) {
          toast.error(err?.message || "Delete failed");
        } finally {
          setShowDeleteConfirm(false);
        }
      };

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={`/settings/users/${u.id}/edit`}>
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>Edit Role & Markup</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={(e) => {                  
                  setShowActiveConfirm(true);
                }}
              >
                {u.isActive ? (
                  <PowerOff className="mr-2 h-4 w-4" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                <span>{activeActionLabel}</span>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`/settings/users/${u.id}/change-password`}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="group text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-600 group-focus:text-red-700" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            isOpen={showActiveConfirm}
            onClose={() => setShowActiveConfirm(false)}
            onConfirm={handleToggleActive}
            itemName={`user ${u.username}`}
            title={u.isActive ? "Deactivate user?" : "Activate user?"}
            description={
              u.isActive
                ? `This user will not be able to log in or use the system until activated again.`
                : `This user will be able to log in and use the system again.`
            }
            confirmText={u.isActive ? "Deactivate" : "Activate"}
          />

          <DeleteConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            itemName={`user ${u.username}`}
          />
        </div>
      );
    },
  },
];
