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

// Esquema de validación con Zod para asegurar que las contraseñas coincidan
const formSchema = z.object({
  newPassword: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

interface AdminChangePasswordFormProps {
  user: User;
}

export function AdminChangePasswordForm({ user }: AdminChangePasswordFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Reutilizamos la función 'updateUser' existente, pasándole solo la nueva contraseña.
      await updateUser(user.id, { password: data.newPassword });
      toast.success(`Contraseña para ${user.username} actualizada exitosamente.`);
      router.push("/settings/users");
    } catch (error: any) {
      toast.error(error.message || "Ocurrió un error al cambiar la contraseña.");
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Restablecer Contraseña para <span className="font-bold text-primary">{user.username}</span></CardTitle>
        <CardDescription>
          Establece una nueva contraseña para este usuario. Esta acción es irreversible.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-sm text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Guardando..." : "Establecer Contraseña"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
