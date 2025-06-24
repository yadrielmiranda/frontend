'use client';

import { useState } from "react"; // Necesitas useState para controlar la apertura/cierre del Dialog
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Importa los componentes de Dialog
import { User } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { logoutUser } from "@/app/api/users.api";
import { CardLogin } from "@/components/card-login"; // Asumo esta es la ruta a tu CardLogin


export function UserDropdown() {
  const { isAuthenticated, user, isLoading, setUser, revalidate } = useAuth();
  const router = useRouter();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false); // Estado para controlar la apertura del Dialog

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      revalidate();
      router.push('/'); // Redirige al login o a la página principal
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión. Inténtalo de nuevo.");
    }
  };

  // Función que se llamará cuando el login en el CardLogin sea exitoso
  const handleLoginSuccess = async () => {
    setIsLoginDialogOpen(false); // Cierra el modal de login
    await revalidate(); // Revalida el estado de autenticación
    router.push('/otra'); // Redirige a la página deseada después del login
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
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
          </>
        ) : (
          // --- AQUÍ EL CAMBIO PARA ABRIR EL DIALOG ---
          <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
            <DialogTrigger asChild>
              {/* Este DropdownMenuItem ahora actúa como el disparador del Dialog */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}> {/* preventDefault para evitar que el dropdown se cierre inmediatamente si el dialog lo gestiona */}
                Log In
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              {/* Puedes añadir un DialogHeader si quieres un título en el modal,
                  pero CardLogin ya tiene su propio CardHeader.
                  Puedes personalizarlo aquí si lo necesitas. */}
               {<DialogHeader>
                <DialogTitle>Login to your account</DialogTitle>
                <DialogDescription>
                  Enter your username and password below to login to your account
                </DialogDescription>
              </DialogHeader> }
              <div className="py-4">
                {/* Pasa una prop para que CardLogin sepa cómo cerrar el dialog */}
                <CardLogin onLoginSuccess={handleLoginSuccess} />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}