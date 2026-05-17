"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

import { updateUser } from "@/app/api/users.api";
import { User } from "@/lib/types";

const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

interface AdminChangePasswordFormProps {
  user: User;
}

export function AdminChangePasswordForm({
  user,
}: AdminChangePasswordFormProps) {
  const router = useRouter();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const displayName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.username ||
    user.email ||
    "this user";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await updateUser(user.id, { password: data.newPassword });

      toast.success(`Password for ${user.username} updated successfully.`);

      setIsSuccess(true);
      router.push("/settings/users");
    } catch (error: any) {
      toast.error(
        error.message || "An error occurred while changing the password.",
      );
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <Card className="w-full max-w-xl overflow-hidden rounded-3xl border-slate-200 shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-6 py-7 text-white">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-950/30 ring-1 ring-white/15">
          <UserCog className="h-6 w-6" />
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight">
          Reset User Password
        </CardTitle>

        <CardDescription className="mt-2 text-white/65">
          Set a new password for this user account.
        </CardDescription>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-red-50 p-2 text-red-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-lg">Administrator action</CardTitle>
              <CardDescription>
                You are updating the password for{" "}
                <span className="font-semibold text-slate-900">
                  {displayName}
                </span>
                .
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">User account</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Username
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                  {user.username || "Not set"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                  {user.email || "Not set"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter the new password"
                disabled={showLoadingState}
                {...register("newPassword")}
                className="h-11 pl-10 pr-10"
              />

              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                aria-label={
                  showNewPassword ? "Hide new password" : "Show new password"
                }
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {errors.newPassword && (
              <p className="text-sm text-red-500">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>

            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm the new password"
                disabled={showLoadingState}
                {...register("confirmPassword")}
                className="h-11 pl-10 pr-10"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                aria-label={
                  showConfirmPassword
                    ? "Hide password confirmation"
                    : "Show password confirmation"
                }
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Important security note
            </p>
            <p className="mt-1 text-sm text-amber-800/80">
              This action changes the user&apos;s password immediately. Share
              the new password securely and ask the user to update it after
              signing in.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t bg-slate-50/70 px-6 py-5">
          <Button
            type="submit"
            disabled={showLoadingState}
            className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
          >
            {showLoadingState && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showLoadingState ? "Saving..." : "Set Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
