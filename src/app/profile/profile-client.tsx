"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { UserForm } from "@/app/settings/(write)/users/new/user-form";
import { getProfile } from "@/app/api/auth/me/auth.api";
import { deleteMyAccount } from "@/app/api/users.api";

import type { User } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ProfileClient({
  initialAuthUser,
}: {
  initialAuthUser: AuthUser;
}) {
  const router = useRouter();
  const { setUser } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const roleName = profileUser?.role?.name ?? initialAuthUser.role?.name;
  const canDeleteOwnAccount = roleName !== "admin";

  useEffect(() => {
    setUser(initialAuthUser as unknown as User);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAuthUser.id]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);

      try {
        const fullUserData = await getProfile();

        const completeUser: User = {
          ...fullUserData,
          role: (fullUserData as any)?.role ?? (initialAuthUser.role as any),
        };

        setProfileUser(completeUser);
        setUser(completeUser);
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast.error("Could not load profile data.");
        setProfileUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAuthUser.id]);

  const handleProfileUpdate = (updatedUserFromApi: User) => {
    const roleToKeep = profileUser?.role ?? (initialAuthUser.role as any);

    if (!roleToKeep) {
      toast.error("An error occurred while updating. Please reload the page.");
      return;
    }

    const completeUpdatedUser: User = {
      ...updatedUserFromApi,
      role: roleToKeep,
    };

    setProfileUser(completeUpdatedUser);
    setUser(completeUpdatedUser);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }

    setIsDeleting(true);

    try {
      await deleteMyAccount();

      setUser(null as any);
      toast.success("Your account has been deleted.");

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Could not delete your account.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <p className="text-center pt-20">
        Could not load profile data. Please log in and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>

        <CardContent>
          <UserForm
            user={profileUser}
            roles={[profileUser.role]}
            onProfileUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Security</CardTitle>
          <CardDescription>Manage your account security.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                It is recommended to change your password periodically.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push("/profile/change-password")}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {canDeleteOwnAccount && (
        <Card className="w-full max-w-4xl border-destructive/40">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Deleting your account will revoke your access immediately. Your
              historical estimates, orders, payments, and logs will be preserved.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between gap-4 p-4 border border-destructive/40 rounded-lg">
              <div>
                <p className="font-medium">Delete account</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>

              <AlertDialog
                onOpenChange={(open) => {
                  if (!open) setDeleteConfirmText("");
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will deactivate your account, revoke your sessions,
                      and remove your login access. Type DELETE to confirm.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <Input
                    value={deleteConfirmText}
                    onChange={(event) =>
                      setDeleteConfirmText(event.target.value)
                    }
                    placeholder="Type DELETE"
                    disabled={isDeleting}
                  />

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                      disabled={deleteConfirmText !== "DELETE" || isDeleting}
                      onClick={(event) => {
                        event.preventDefault();
                        handleDeleteAccount();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}