'use client';

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserRoundPlus, Loader2 } from "lucide-react";
import { loginUser } from "@/app/api/users.api";
import { useAuth } from '@/contexts/AuthContext';

// 1. Definimos el esquema de validación con Zod para el login
const loginSchema = z.object({
  identifier: z.string().min(1, { message: "El usuario o email es requerido." }),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
});

// Derivamos el tipo de los datos del formulario
type LoginFormData = z.infer<typeof loginSchema>;

interface CardLoginProps {
  onLoginSuccess?: () => void;
}

export function CardLogin({ onLoginSuccess }: CardLoginProps) {
  const router = useRouter();
  const { revalidate } = useAuth();

  // 2. Configuramos react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // 3. La función onSubmit ahora recibe los datos validados
  const handleLogin = async (data: LoginFormData) => {
    try {
      await loginUser(data);
      await revalidate(); // Revalida el contexto para obtener los datos del usuario

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
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent>
        {/* 4. Usamos el handleSubmit de react-hook-form */}
        <form onSubmit={handleSubmit(handleLogin)}>
          <div className="flex flex-col gap-6 pt-6">
            {/* 5. Conectamos los inputs y mostramos errores */}
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
                <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
            </div>
          </div>
          <CardFooter className="flex-col gap-2 pt-6">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Iniciando sesión..." : "Login"}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSignUpClick} disabled={isSubmitting}>
              <UserRoundPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
