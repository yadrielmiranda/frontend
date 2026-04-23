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
import { Menu } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "./notifications-bell";
import { canAccessSettings } from "@/lib/rbac";

function TopBar() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <header className=" sticky top-0 z-50 flex items-center justify-between p-4 bg-white  border-b-2 border-red-700 shadow-sm">
        <div className="flex items-center gap-4"> 
          <Link href="/" className="flex items-center">
            <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
              Authentic Evolution
            </h1>
          </Link>
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
    <header className=" sticky top-0 z-50 flex items-center justify-between p-4 bg-white  border-b-2 border-red-700 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
            Authentic Evolution
          </h1>
        </Link>
      </div>

      {/* --- Contenido para Usuarios Autenticados (Desktop) --- */}
      {isAuthenticated && (
        <nav className="hidden md:flex items-center gap-6">
          <Button variant="ghost" asChild>
            <Link href="/estimates">Estimates</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/orders">Orders</Link>
          </Button>

          {canAccessSettings(user?.role.name) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Settings</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <SettingsMenuItems role={user?.role?.name} />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      )}

      {/* --- Acciones y Perfil de Usuario --- */}
      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <>            
            <NotificationBell />
          </>
        )}

        <UserDropdown />

        <div className="md:hidden">
          {isAuthenticated && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>

              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navegación</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-4 mt-6">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/estimates">Estimates</Link>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link href="/orders">Orders</Link>
                  </Button>

                  {canAccessSettings(user?.role.name) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          Settings
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <SettingsMenuItems role={user?.role?.name} />
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
