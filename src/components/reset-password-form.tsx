"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { resetPassword } from "@/app/api/auth/me/auth.api";
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

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

interface ResetPasswordFormProps {
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const hasToken = Boolean(token);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error("Invalid reset link.");
      return;
    }

    try {
      const response = await resetPassword({
        token,
        password: data.password,
      });

      toast.success(response.message || "Password updated successfully.");

      setIsSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (error: any) {
      toast.error("Could not reset password", {
        description:
          error?.message || "The reset link may be invalid or expired.",
      });
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <Card className="w-full max-w-xl overflow-hidden rounded-3xl border-slate-200 shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-6 py-7 text-white">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-950/30 ring-1 ring-white/15">
          <KeyRound className="h-6 w-6" />
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight">
          Reset Password
        </CardTitle>

        <CardDescription className="mt-2 text-white/65">
          Create a new password for your account.
        </CardDescription>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-red-50 p-2 text-red-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-lg">
                {hasToken ? "Secure password reset" : "Invalid reset link"}
              </CardTitle>
              <CardDescription>
                {hasToken
                  ? "Choose a new password to regain access."
                  : "This reset link is missing a valid token."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {!hasToken ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Missing reset token
              </p>
              <p className="mt-1 text-sm text-amber-800/80">
                Please request a new password reset link and try again.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    disabled={showLoadingState}
                    {...register("password")}
                    className="h-11 pl-10 pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
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
                    placeholder="Confirm your new password"
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Password requirements
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use at least 8 characters. A stronger password should include
                  uppercase letters, lowercase letters, numbers, and symbols.
                </p>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t bg-slate-50/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            asChild
            className="h-10 rounded-xl px-0 text-slate-600 hover:bg-transparent hover:text-red-600"
          >
            <Link href="/login" className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                <ArrowLeft className="h-4 w-4" />
              </span>
              <span className="font-medium">Back to Login</span>
            </Link>
          </Button>

          {hasToken && (
            <Button
              type="submit"
              disabled={showLoadingState}
              className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700 sm:w-auto"
            >
              {showLoadingState && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {showLoadingState ? "Saving..." : "Reset Password"}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
