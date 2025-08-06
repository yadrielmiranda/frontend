"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserDropdown } from "@/components/user-dropdown";
import { SettingsMenuItems } from "./settings-menu-items";
import { Bell, Menu } from "lucide-react";

function TopBar() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // El estado de carga no cambia, está bien como está.
  if (isLoading) {
    return (
      <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">Impact +</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-24 h-8 bg-gray-200 animate-pulse rounded hidden md:block"></div>
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
          <UserDropdown />
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse md:hidden"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">Impact +</h1>
      </div>

      {/* --- Contenido para Usuarios Autenticados (Desktop) --- */}
      {isAuthenticated && (
        <nav className="hidden md:flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost">Proyectos</Button></DropdownMenuTrigger>
            <DropdownMenuContent>{/* ...items de proyectos... */}</DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost">Tareas</Button>
          <Button variant="ghost">Equipos</Button>

          {user?.role.name === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost">Settings</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                <SettingsMenuItems />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      )}

      {/* --- Acciones y Perfil de Usuario --- */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <>
            <Input placeholder="Buscar..." className="hidden md:block w-48" />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>
          </>
        )}

        <UserDropdown />

        {/* ======================= LA CORRECCIÓN ESTÁ AQUÍ ======================= */}
        {/* El div para el menú móvil AHORA SIEMPRE EXISTE en el DOM */}
        {/* Esto hace que el render del servidor y del cliente coincidan. */}
        <div className="md:hidden">
          {/* PERO el contenido del menú (el Sheet) solo aparece si estás autenticado */}
          {isAuthenticated && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu /></Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle>Navegación</SheetTitle></SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <Button variant="ghost" className="w-full justify-start">Proyectos</Button>
                  <Button variant="ghost" className="w-full justify-start">Tareas</Button>
                  <Button variant="ghost" className="w-full justify-start">Equipos</Button>
                  
                  {user?.role.name === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">Settings</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <SettingsMenuItems />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
       
      </div>
    </header>
  );
}

export default TopBar;