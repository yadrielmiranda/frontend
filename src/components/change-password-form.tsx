'use client';

import { useState } from "react"; // Importamos useState
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react"; // Importamos Eye y EyeOff
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { changePassword } from "@/app/api/auth/me/auth.api";

// Esquema de validación con Zod
const formSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // El error se muestra en el campo de confirmación
});

type FormData = z.infer<typeof formSchema>;

export function ChangePasswordForm() {
  const router = useRouter();

  // Estados para controlar la visibilidad de cada campo de contraseña
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estado local para controlar el éxito (ya estaba)
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success(response.message);

      setIsSuccess(true);
      reset();
      router.push("/profile");
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Enter your current password and your new password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative"> {/* Contenedor para el input y el icono */}
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"} // Tipo condicional
                {...register("currentPassword")}
                className="pr-10" // Añade padding a la derecha
              />
              <button
                type="button" // Importante: para que no envíe el formulario
                onClick={() => setShowCurrentPassword(prev => !prev)} // Alterna visibilidad
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showCurrentPassword ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                tabIndex={-1} // CAMBIO: Elimina el botón del orden de tabulación
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-sm text-red-500 mt-1">{errors.currentPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative"> {/* Contenedor para el input y el icono */}
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"} // Tipo condicional
                {...register("newPassword")}
                className="pr-10" // Añade padding a la derecha
              />
              <button
                type="button" // Importante: para que no envíe el formulario
                onClick={() => setShowNewPassword(prev => !prev)} // Alterna visibilidad
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                tabIndex={-1} // CAMBIO: Elimina el botón del orden de tabulación
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-sm text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative"> {/* Contenedor para el input y el icono */}
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"} // Tipo condicional
                {...register("confirmPassword")}
                className="pr-10" // Añade padding a la derecha
              />
              <button
                type="button" // Importante: para que no envíe el formulario
                onClick={() => setShowConfirmPassword(prev => !prev)} // Alterna visibilidad
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                tabIndex={-1} // CAMBIO: Elimina el botón del orden de tabulación
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={showLoadingState}>
            Cancel
          </Button>
          <Button type="submit" disabled={showLoadingState}>
            {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLoadingState ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
