"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { forgotPassword } from "@/app/api/auth/me/auth.api";
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

const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
});

type FormData = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await forgotPassword({
        email: data.email,
      });

      setIsSent(true);

      toast.success("Password reset email sent", {
        description:
          "If an account exists with that email, you will receive a reset link.",
      });
    } catch (error: any) {
      toast.error("Could not send reset email", {
        description: error?.message || "Please try again.",
      });
    }
  };

  return (
    <Card className="w-full max-w-xl overflow-hidden rounded-3xl border-slate-200 shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-6 py-7 text-white">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-950/30 ring-1 ring-white/15">
          <Mail className="h-6 w-6" />
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot Password
        </CardTitle>

        <CardDescription className="mt-2 text-white/65">
          Enter your email and we will send you a secure reset link.
        </CardDescription>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-red-50 p-2 text-red-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-lg">Account recovery</CardTitle>
              <CardDescription>
                For security, we will not confirm whether the email exists.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {isSent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900">
                Check your email
              </p>
              <p className="mt-1 text-sm text-emerald-800/80">
                If an account exists with that email, a password reset link has
                been sent.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                  {...register("email")}
                  className="h-11 pl-10"
                />
              </div>

              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
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

          {!isSent && (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700 sm:w-auto"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
