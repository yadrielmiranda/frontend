// CardLogin.tsx
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/app/api/users.api";
import { useAuth } from '@/contexts/AuthContext';

// Define las props que CardLogin aceptará
interface CardLoginProps {
  onLoginSuccess?: () => void; // Función opcional para llamar al éxito del login
}

// Actualiza la declaración de la función para aceptar las props
export function CardLogin({ onLoginSuccess }: CardLoginProps) {
  const router = useRouter();
  const { revalidate } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userData = {
        username,
        password,
      };

      await loginUser(userData);
      await revalidate();

      console.log("Login exitoso. Revalidación solicitada.");

      // Si se proporcionó onLoginSuccess, llamarlo para cerrar el modal
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // Si no está en un modal (ej. en una página dedicada de login), redirige normalmente
        router.push('/otra'); // O cualquier otra ruta protegida
      }

    } catch (err: any) {
      console.error("Error al iniciar sesión:", err);
      setError(err.message || "Credenciales inválidas o error en el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpClick = () => {
    router.push('/login/register');
  };

  return (
    <Card className="w-full max-w-sm">
      {/* ... (el resto de tu CardLogin.tsx permanece igual) ... */}
   { /* <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your username and password below to login to your account
        </CardDescription>
        <CardAction>
          <Button variant="link" onClick={handleSignUpClick}>Sign Up</Button>
        </CardAction>
      </CardHeader> */}
      <CardContent>
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

          <CardFooter className="flex-col gap-2 pt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignUpClick}
              disabled={isLoading}
            >
              <UserRoundPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}