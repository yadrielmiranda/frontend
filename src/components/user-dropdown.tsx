'use client';

import { useState, useEffect } from "react";
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
import { useLoginDialog } from '@/contexts/LoginDialogContext'; // Importar el hook del contexto

export function UserDropdown() {
  const { isAuthenticated, user, isLoading, revalidate } = useAuth();
  const router = useRouter();
  // Usamos el estado del diálogo del contexto
  const { isLoginDialogOpen, setIsLoginDialogOpen, closeLoginDialog, openLoginDialog } = useLoginDialog();

  // Nuevo estado para controlar la apertura del DropdownMenu
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      await revalidate();
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleLoginSuccess = () => {
    closeLoginDialog(); // Cierra el diálogo al iniciar sesión exitosamente usando la función del contexto
    setIsDropdownOpen(false); // Asegurarse de que el dropdown también se cierre
  };

  // Esta función se llama cuando CardLogin solicita cerrarse (ej. al hacer clic en Sign Up)
  const handleCloseLoginDialogAndDropdown = () => {
    closeLoginDialog(); // Cierra el diálogo
    setIsDropdownOpen(false); // Cierra el dropdown
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
    // El Dialog sigue controlando su propia apertura/cierre con isLoginDialogOpen
    <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
      {/* Controlamos el DropdownMenu con el nuevo estado isDropdownOpen */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
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
                  <p className="text-sm font-medium leading-none">{`${user.firstName} ${user.lastName}`}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  {/* Muestra el rol como una insignia */}
                  {user.role && (
                    <p className="text-xs leading-none text-muted-foreground pt-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {user.role.name}
                      </span>
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setIsDropdownOpen(false); router.push('/profile'); }}>Mi Perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}>Configuración</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
            </>
          ) : (
            <DialogTrigger asChild>
              {/* Al hacer clic en Log In, cerramos el dropdown y abrimos el diálogo */}
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault(); // Previene el comportamiento por defecto de Radix para que podamos controlar el cierre
                setIsDropdownOpen(false); // Cierra el dropdown
                openLoginDialog(); // Abre el diálogo de login a través del contexto
              }}>
                Log In
              </DropdownMenuItem>
            </DialogTrigger>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inicia sesión</DialogTitle>
          <DialogDescription>
            Usa tu nombre de usuario o email para acceder a tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CardLogin
            onLoginSuccess={handleLoginSuccess}
            onClose={handleCloseLoginDialogAndDropdown} // Pasamos la nueva función para cerrar ambos
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
