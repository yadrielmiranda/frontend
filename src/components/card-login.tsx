'use client';

import { useState } from "react"; // Importamos useState
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserRoundPlus, Loader2, Eye, EyeOff } from "lucide-react"; // Importamos Eye y EyeOff
import { loginUser } from "@/app/api/users.api";
import { useAuth } from '@/contexts/AuthContext';

// 1. Define the validation schema with Zod for login
const loginSchema = z.object({
  identifier: z.string().min(1, { message: "El usuario o email es requerido." }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
});

// Derive the type of the form data
type LoginFormData = z.infer<typeof loginSchema>;

interface CardLoginProps {
  onLoginSuccess?: () => void;
  // Add a prop to close the component
  onClose?: () => void;
}

export function CardLogin({ onLoginSuccess, onClose }: CardLoginProps) {
  const router = useRouter();
  const { revalidate } = useAuth();
  const [showPassword, setShowPassword] = useState(false); // Nuevo estado para la visibilidad de la contraseña

  // 2. Configure react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // 3. The onSubmit function now receives validated data
  const handleLogin = async (data: LoginFormData) => {
    try {
      await loginUser(data);
      await revalidate(); // Revalidate the context to get user data

      toast.success("¡Inicio de sesión exitoso!");

      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        router.push('/');
      }
    } catch (err: any) {
      toast.error("Error al iniciar sesión", {
        description: err.message || "Credenciales inválidas o error en el servidor.",
      });
    }
  };

  const handleSignUpClick = () => {
    router.push('/login/register');
    // If the onClose function is provided, call it to notify the parent
    if (onClose) {
      onClose();
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent>
        {/* 4. Use react-hook-form's handleSubmit */}
        <form onSubmit={handleSubmit(handleLogin)}>
          <div className="flex flex-col gap-6 pt-6">
            {/* 5. Connect inputs and display errors */}
            <div className="grid gap-2">
              <Label htmlFor="identifier">Usuario o Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Ingresa tu usuario o email"
                {...register("identifier")}
              />
              {errors.identifier && <p className="text-sm text-red-500 mt-1">{errors.identifier.message}</p>}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
                <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-blue-400" tabIndex={-1}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative"> {/* Contenedor para el input y el icono */}
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"} // Cambia el tipo según el estado
                  placeholder="Ingresa tu contraseña"
                  {...register("password")}
                  className="pr-10" // Añade padding a la derecha para el icono
                />
                <button
                  type="button" // Importante: para que no envíe el formulario
                  onClick={() => setShowPassword(prev => !prev)} // Alterna la visibilidad
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1} // CAMBIO: Elimina el botón del orden de tabulación
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
            </div>
          </div>
          <CardFooter className="flex-col gap-2 pt-6">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Iniciando sesión..." : "Login"}
            </Button>
            {/* CAMBIO CLAVE: Añadimos type="button" para evitar la validación del formulario */}
            <Button type="button" variant="outline" className="w-full" onClick={handleSignUpClick} disabled={isSubmitting}>
              <UserRoundPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
