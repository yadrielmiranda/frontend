'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserRoundPlus, Loader2, Eye, EyeOff } from "lucide-react";

import { loginUser } from "@/app/api/auth/me/auth.api";
import { useAuth } from "@/contexts/AuthContext";

// ✅ Validation schema (English)
const loginSchema = z.object({
  identifier: z.string().min(1, { message: "Username or email is required." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type LoginFormData = z.infer<typeof loginSchema>;

type CardLoginMode = "full" | "unlock";

interface CardLoginProps {
  onLoginSuccess?: () => void;
  onClose?: () => void;

  /**
   * full  -> normal login (shows Sign up + Forgot password)
   * unlock -> session expired re-login (hides Sign up + Forgot password)
   */
  mode?: CardLoginMode;

  /**
   * Optional: lock the identifier input to prevent switching accounts on unlock.
   * Default false (allows switching accounts).
   */
  lockIdentifier?: boolean;

  /**
   * Optional: prefill identifier (useful if you want to suggest same user).
   * If you don't want that, don't pass it.
   */
  defaultIdentifier?: string;
}

export function CardLogin({
  onLoginSuccess,
  onClose,
  mode = "full",
  lockIdentifier = false,
  defaultIdentifier,
}: CardLoginProps) {
  const router = useRouter();
  const { revalidate } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const isUnlock = mode === "unlock";

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

  return (
    <Card className="w-full max-w-sm">
      <CardContent>
        <form onSubmit={handleSubmit(handleLogin)}>
          <div className="flex flex-col gap-6 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter your username or email"
                disabled={isSubmitting || lockIdentifier}
                {...register("identifier")}
              />
              {errors.identifier && (
                <p className="text-sm text-red-500 mt-1">{errors.identifier.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>

                {/* ✅ Hide in unlock mode */}
                {!isUnlock && (
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-blue-400"
                    tabIndex={-1}
                  >
                    Forgot your password?
                  </a>
                )}
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  {...register("password")}
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <CardFooter className="flex-col gap-2 pt-6">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Signing in..." : (isUnlock ? "Unlock session" : "Sign in")}
            </Button>

            {/* ✅ Hide Sign up in unlock mode */}
            {!isUnlock && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSignUpClick}
                disabled={isSubmitting}
              >
                <UserRoundPlus className="mr-2 h-4 w-4" />
                Sign up
              </Button>
            )}
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
