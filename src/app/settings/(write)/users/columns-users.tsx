"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, MoreHorizontal, Trash2, UserCog, Star } from "lucide-react";
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

import type { User } from "@/app/api/types";
import { deleteUser } from "@/app/api/users.api";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";

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
    id: "actions",
    cell: ({ row }) => {
      const u = row.original;
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const router = useRouter();

      const { user } = useAuth();
      const role = user?.role?.name ?? null;
      const canEdit = isAdmin(role);

      if (!canEdit) return <div className="text-right text-muted-foreground">—</div>;

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
