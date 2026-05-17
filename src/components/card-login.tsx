"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LogIn,
  UserRoundPlus,
  Loader2,
  Eye,
  EyeOff,
  User,
  Lock,
  ChevronRight,
} from "lucide-react";

import { loginUser } from "@/app/api/auth/me/auth.api";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  identifier: z.string().min(1, { message: "Username or email is required." }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

type LoginFormData = z.infer<typeof loginSchema>;

type CardLoginMode = "full" | "unlock";
type CardLoginAppearance = "light" | "dark";

interface CardLoginProps {
  onLoginSuccess?: () => void;
  onClose?: () => void;
  mode?: CardLoginMode;
  appearance?: CardLoginAppearance;
  lockIdentifier?: boolean;
  defaultIdentifier?: string;
}

export function CardLogin({
  onLoginSuccess,
  onClose,
  mode = "full",
  appearance = "light",
  lockIdentifier = false,
  defaultIdentifier,
}: CardLoginProps) {
  const router = useRouter();
  const { revalidate } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const isUnlock = mode === "unlock";
  const isDark = appearance === "dark";
  const signUpLabel = "New client? Create an account";
  const forgotPasswordLabel = "Forgot your password?";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: defaultIdentifier ?? "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      await loginUser(data);
      await revalidate();

      toast.success(isUnlock ? "Session restored." : "Signed in successfully.");

      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        router.push("/");
      }
    } catch (err: any) {
      toast.error("Sign in failed", {
        description: err?.message || "Invalid credentials or server error.",
      });
    }
  };

  const handleSignUpClick = () => {
    router.push("/login/register");
    if (onClose) onClose();
  };

  const handleForgotPasswordClick = () => {
    router.push("/login/forgot-password");
    if (onClose) onClose();
  };

  const containerClass = isDark
    ? "w-full rounded-3xl border border-red-600/70 bg-black/45 p-5 shadow-[0_0_45px_rgba(220,38,38,0.12)] backdrop-blur-xl sm:p-6"
    : "w-full max-w-sm rounded-xl border bg-card p-6 text-card-foreground shadow-sm";

  const labelClass = isDark
    ? "text-xs font-medium text-white"
    : "text-sm font-medium text-foreground";

  const inputClass = isDark
    ? "h-11 border-white/15 bg-black/35 pl-10 text-white placeholder:text-white/35 focus-visible:ring-red-600"
    : "h-10";

  const iconClass = isDark ? "text-white/45" : "text-muted-foreground";
  const errorClass = "mt-1 text-xs text-red-400";

  return (
    <div className={containerClass}>
      <div className="mb-6 text-center">
        <h2
          className={
            isDark
              ? "text-2xl font-semibold text-white"
              : "text-2xl font-semibold"
          }
        >
          {isUnlock ? "Session expired" : "Access Portal"}
        </h2>

        <p
          className={
            isDark
              ? "mt-1 text-sm text-white/45"
              : "mt-1 text-sm text-muted-foreground"
          }
        >
          {isUnlock
            ? "Sign in again to continue."
            : "Sign in to continue to your quoting workspace."}
        </p>
      </div>

      <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier" className={labelClass}>
            Username or Email
          </Label>

          <div className="relative">
            {isDark && (
              <User
                className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconClass}`}
              />
            )}

            <Input
              id="identifier"
              type="text"
              placeholder="Enter your username or email"
              disabled={isSubmitting || lockIdentifier}
              autoComplete="username"
              className={inputClass}
              {...register("identifier")}
            />
          </div>

          {errors.identifier && (
            <p className={errorClass}>{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={labelClass}>
            Password
          </Label>

          <div className="relative">
            {isDark && (
              <Lock
                className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconClass}`}
              />
            )}

            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete={isUnlock ? "current-password" : "current-password"}
              className={`${inputClass} pr-10`}
              {...register("password")}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={
                isDark
                  ? "absolute inset-y-0 right-0 flex items-center pr-3 text-white/45 hover:text-white"
                  : "absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              }
              aria-label={showPassword ? "Hide password" : "Show password"}
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
            <p className={errorClass}>{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className={
            isDark
              ? "h-11 w-full rounded-xl bg-red-600 font-semibold text-white shadow-lg shadow-red-950/40 hover:bg-red-700"
              : "w-full"
          }
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {isSubmitting
            ? "Signing in..."
            : isUnlock
              ? "Unlock session"
              : "Sign In"}
        </Button>

        {!isUnlock && !isDark && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSignUpClick}
            disabled={isSubmitting}
          >
            <UserRoundPlus className="mr-2 h-4 w-4" />
            {signUpLabel}
          </Button>
        )}

        {!isUnlock && isDark && (
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleForgotPasswordClick}
              disabled={isSubmitting}
              className="flex w-full items-center justify-between text-sm text-red-500 hover:text-red-400 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {forgotPasswordLabel}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleSignUpClick}
              disabled={isSubmitting}
              className="flex w-full items-center justify-between pt-1 text-sm text-white/60 hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <UserRoundPlus className="h-4 w-4" />
                {signUpLabel}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
