"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  UserCircle,
} from "lucide-react";
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

  const displayName = useMemo(() => {
    if (!profileUser) return "Profile";

    const fullName = `${profileUser.firstName ?? ""} ${
      profileUser.lastName ?? ""
    }`.trim();

    return fullName || profileUser.username || profileUser.email || "Profile";
  }, [profileUser]);

  const initials = useMemo(() => {
    if (!profileUser) return "U";

    const first = profileUser.firstName?.trim()?.[0];
    const last = profileUser.lastName?.trim()?.[0];

    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();

    return (
      profileUser.username?.[0] ||
      profileUser.email?.[0] ||
      "U"
    ).toUpperCase();
  }, [profileUser]);

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-red-600" />
          <span className="text-sm font-medium text-slate-600">
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <Card className="rounded-3xl border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Profile unavailable
            </CardTitle>
            <CardDescription>
              Could not load profile data. Please log in and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white shadow-xl">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-2xl font-bold text-white shadow-lg shadow-red-950/30 ring-1 ring-white/15">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-red-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                {roleName ? `${roleName} account` : "account"}
              </div>

              <h1 className="truncate text-3xl font-bold tracking-tight md:text-4xl">
                {displayName}
              </h1>

              <p className="mt-2 text-sm text-white/65">
                Manage your personal information, account access, and security.
              </p>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80 md:block">
            <p className="font-semibold text-white">Account status</p>
            <p className="mt-1 inline-flex items-center gap-2 text-white/70">
              <BadgeCheck className="h-4 w-4 text-red-300" />
              Active profile
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/70">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserCircle className="h-5 w-5 text-red-600" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your contact details and address information.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <UserForm
                user={profileUser}
                roles={[profileUser.role]}
                onProfileUpdate={handleProfileUpdate}
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <KeyRound className="h-5 w-5 text-red-600" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security.</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">Password</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    It is recommended to change your password periodically.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => router.push("/profile/change-password")}
                  className="shrink-0"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {canDeleteOwnAccount && (
            <Card className="rounded-3xl border-destructive/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Deleting your account will revoke your access immediately.
                  Historical estimates, orders, payments, and logs will be
                  preserved.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col gap-4 rounded-2xl border border-destructive/30 bg-red-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      Delete account
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This action cannot be undone.
                    </p>
                  </div>

                  <AlertDialog
                    onOpenChange={(open) => {
                      if (!open) setDeleteConfirmText("");
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="shrink-0">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete your account?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will deactivate your account, revoke your
                          sessions, and remove your login access. Type DELETE to
                          confirm.
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
                          disabled={
                            deleteConfirmText !== "DELETE" || isDeleting
                          }
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

        <aside className="space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Account Summary</CardTitle>
              <CardDescription>Your current access details.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Username
                </p>
                <p className="mt-1 truncate font-semibold text-slate-950">
                  {profileUser.username || "Not set"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 truncate font-semibold text-slate-950">
                  {profileUser.email || "Not set"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Role
                </p>
                <p className="mt-1 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold capitalize text-red-700">
                  {roleName || "User"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 bg-slate-950 text-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Need help?</CardTitle>
              <CardDescription className="text-white/60">
                Contact your administrator if your profile information is
                incorrect.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                variant="outline"
                className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                onClick={() => router.push("/")}
              >
                Back to Workspace
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
