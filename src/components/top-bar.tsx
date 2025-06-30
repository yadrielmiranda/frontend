"use client"; // Este componente necesita ser un Client Component

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { Bell } from "lucide-react";
import { UserDropdown } from "@/components/user-dropdown"; // UserDropdown es "inteligente" internamente
import { useAuth } from "@/contexts/AuthContext";

function TopBar() {
  const { isAuthenticated, isLoading } = useAuth(); // Usamos 'isLoading' del contexto

  // --- Estado de Carga ---
  // Muestra un estado de carga mientras se verifica la autenticación.
  if (isLoading) {
    return (
      <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
        {/* Logo siempre visible */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
            Impact +
          </h1>
        </div>
        {/* Placeholders de carga */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-8 bg-gray-200 animate-pulse rounded hidden md:block"></div>{" "}
          {/* Input */}
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>{" "}
          {/* Bell */}
          {/* El UserDropdown tiene su propio estado de carga, por lo que podemos incluirlo */}
          <UserDropdown />
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse md:hidden"></div>{" "}
          {/* Hamburger */}
        </div>
      </header>
    );
  }

  // --- Contenido Principal de la Barra Superior ---
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950 dark:border-gray-800 shadow-sm">
      {/* Logo: Siempre visible */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
          Impact +
        </h1>
      </div>

      {isAuthenticated && (
        // --- Contenido VISIBLE SÓLO para Usuarios Autenticados ---
        <>
          {/* Navegación (visible en desktop) */}
          <nav className="hidden md:flex gap-6">
            {/* ... todo el contenido de DropdownMenu para Proyectos, Tareas, Equipos, Settings ... */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Proyectos</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Gestión de Proyectos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Todos los Proyectos</DropdownMenuItem>
                <DropdownMenuItem>Proyectos Activos</DropdownMenuItem>
                <DropdownMenuItem>Crear Nuevo Proyecto</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Archivados</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Proyectos de 2023</DropdownMenuItem>
                    <DropdownMenuItem>Proyectos de 2022</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost">Tareas</Button>
            <Button variant="ghost">Equipos</Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Settings</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="text-red-500">
                  Ver si ponemos algo aqui
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/brands">Brands</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/products">Products</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/systems">Systems</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/configs">Configs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/framecolors">Frame Colors</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/products">Coating</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/products">Cristals</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/products">Tints</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Tiempo Registrado</DropdownMenuItem>
                <DropdownMenuItem>Cargas de Trabajo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </>
      )}

      {/* Acciones y Perfil de Usuario */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          // --- Elementos VISIBLES SÓLO si está autenticado ---
          <>
            {/* Barra de Búsqueda */}
            <Input placeholder="Buscar..." className="hidden md:block w-48" />

            {/* Botón de Notificaciones */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                0
              </span>
            </Button>
          </>
        )}

        {/* UserDropdown: SIEMPRE VISIBLE */}
        {/* Este componente gestiona si muestra el botón de Login o el menú de perfil */}
        <UserDropdown />

        {isAuthenticated && (
          // --- Menú móvil (Sheet) VISIBLE SÓLO si está autenticado ---
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  ☰ {/* Icono de hamburguesa */}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navegación</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Replicar menús para móvil aquí */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start">
                        Proyectos
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuItem>Todos los Proyectos</DropdownMenuItem>
                      <DropdownMenuItem>Proyectos Activos</DropdownMenuItem>
                      <DropdownMenuItem>Crear Nuevo Proyecto</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" className="w-full justify-start">
                    Tareas
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Equipos
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start">
                        Settings
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuItem asChild>
                        <Link href="/settings/brands">Brands</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings/products">Products</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings/systems">Systems</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings/configs">Configs</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings/framecolors">Frame Colors</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/products">Coating</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/products">Cristals</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/products">Tints</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Tiempo Registrado</DropdownMenuItem>
                      <DropdownMenuItem>Cargas de Trabajo</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* UserDropdown dentro del menú móvil, también SIEMPRE visible */}
                  <UserDropdown />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;
