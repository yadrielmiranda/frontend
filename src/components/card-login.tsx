'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

export function CardLogin({ onLoginSuccess }: CardLoginProps) {
  const router = useRouter();
  const { revalidate } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        const userData = {
        identifier,
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
        router.push('/'); // O cualquier otra ruta protegida
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
      <CardContent>
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-6 pt-6">
            {/*  Actualizamos la UI para reflejar los cambios. */}
            <div className="grid gap-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter your username or email"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
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

          {error && <p className="text-sm text-red-500 mt-4 text-center">{error}</p>}

          <CardFooter className="flex-col gap-2 pt-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                // Tu spinner de carga es perfecto
                <span className="flex items-center">...Loading</span>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </>
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSignUpClick} disabled={isLoading}>
              <UserRoundPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}