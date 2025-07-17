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
  const { isAuthenticated, user, isLoading, revalidate } = useAuth();
  const router = useRouter();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

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
    setIsLoginDialogOpen(false);
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
                  {/* ✅ AÑADIDO: Muestra el rol como una insignia */}
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
              <DropdownMenuItem onClick={() => router.push('/profile')}>Mi Perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>Configuración</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
            </>
          ) : (
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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
          <CardLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
