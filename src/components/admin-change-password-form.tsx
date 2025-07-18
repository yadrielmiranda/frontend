"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { updateUser } from "@/app/api/users.api";
import { User } from "@/app/api/types";
import { useState } from "react"; // ✅ 1. Importa useState

// Esquema de validación con Zod para asegurar que las contraseñas coincidan
const formSchema = z.object({
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

interface AdminChangePasswordFormProps {
  user: User;
}

export function AdminChangePasswordForm({ user }: AdminChangePasswordFormProps) {
  const router = useRouter();
  
  // ✅ 2. Añade el estado local para controlar el éxito
  const [isSuccess, setIsSuccess] = useState(false);

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
      
      // ✅ 3. Marca como exitoso antes de redirigir
      setIsSuccess(true);
      router.push("/settings/users");
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || "An error occurred while changing the password.");
    }
  };

  // ✅ 4. Combina los estados para un control de UI consistente
  const showLoadingState = isSubmitting || isSuccess;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Reset Password for <span className="font-bold text-primary">{user.username}</span></CardTitle>
        <CardDescription>
          Set a new password for this user. This action is irreversible.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-sm text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          {/* ✅ 5. Usa showLoadingState para deshabilitar el botón */}
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={showLoadingState}>
            Cancel
          </Button>
          <Button type="submit" disabled={showLoadingState}>
            {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLoadingState ? "Saving..." : "Set Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
