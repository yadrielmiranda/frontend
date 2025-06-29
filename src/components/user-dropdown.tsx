'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { logoutUser } from "@/app/api/users.api";
import { CardLogin } from "@/components/card-login";


export function UserDropdown() {
  const { isAuthenticated, user, isLoading, revalidate } = useAuth(); // 'setUser' no es necesario aquí
  const router = useRouter();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      await revalidate(); // Revalidate se encargará de limpiar el estado del usuario en el contexto
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Es mejor usar un sistema de notificaciones (toast) en lugar de alert
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginDialogOpen(false);
    // 'revalidate' ya fue llamado dentro de CardLogin, así que aquí solo cerramos el modal.
    // Si quieres, puedes añadir una redirección aquí.
    // router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <Button variant="ghost" disabled>
        <User className="h-4 w-4 animate-spin" />
        <span className="ml-1">Cargando...</span>
      </Button>
    );
  }

  return (
    <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <User className="h-4 w-4" />
            <span className="ml-1">
             
              {/* Usamos user.username porque es más corto y siempre debería estar presente */}
              {isAuthenticated && user ? user.username : "Login"}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          {isAuthenticated && user ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                 
                  {/* Usamos 'firstName' y 'lastName' con la 'N' mayúscula */}
                  <p className="text-sm font-medium leading-none">{`${user.firstName} ${user.lastName}`}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>Mi Perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>Configuración</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
            </>
          ) : (
            // Este trigger abrirá el Dialog que envuelve todo el componente
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Log In
              </DropdownMenuItem>
            </DialogTrigger>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* El contenido del Dialog que se mostrará cuando se haga clic en 'Log In' */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inicia sesión</DialogTitle>
          <DialogDescription>
            Usa tu nombre de usuario o email para acceder a tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CardLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
