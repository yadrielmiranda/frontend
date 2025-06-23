"use client"; // <-- ¡Este componente es un Cliente!

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext'; // Importa el hook del contexto
import { useRouter } from 'next/navigation'; // Necesitas useRouter en Client Components

export function UserDropdown() { // Renombré a UserDropdown
  const { isAuthenticated, user, isLoading, setUser, revalidate } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/api/auth/logout', { method: 'POST' });
      setUser(null); // Limpia los datos del usuario en el contexto
      revalidate();
      router.push('/'); // Redirige al login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión. Inténtalo de nuevo.");
    }
  };

  if (isLoading) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" disabled>
            <User className="h-4 w-4 animate-spin" />
            <span className="ml-1">Cargando...</span>
          </Button>
        </DropdownMenuTrigger>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <User className="h-4 w-4" />
          <span className="ml-1">
            {isAuthenticated && user ? user.username : "Login"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {isAuthenticated && user ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.firstname + ' ' + user.lastname}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email }
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Cerrar Sesión</DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => router.push('/')}>Iniciar Sesión</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}