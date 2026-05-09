"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import Image from "next/image";
import { NotificationBell } from "./notifications-bell";
import { canAccessSettings } from "@/lib/rbac";
import { usePathname } from "next/navigation";

function TopBar() {
  const { isAuthenticated, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white border-b-2 border-red-700 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Authentic Evolution"
              width={44}
              height={44}
              className="h-20 w-auto object-contain"
              priority
            />
            <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
              Authentic Evolution
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden h-8 w-24 animate-pulse rounded bg-gray-200 md:block" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 md:hidden" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-white border-b-2 border-red-700 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Authentic Evolution"
            width={44}
            height={44}
            className="h-15 w-auto object-contain"
            priority
          />
          <h1 className="text-xl font-bold text-red-800 dark:text-gray-50">
            Authentic Evolution
          </h1>
        </Link>
      </div>

      {isAuthenticated && (
        <nav className="hidden md:flex items-center gap-6">
          <Button variant="ghost" asChild>
            <Link href="/estimates">Estimates</Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link href="/orders">Orders</Link>
          </Button>

          {canAccessSettings(user?.role?.name) && (
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

      <div className="flex items-center gap-4">
        {isAuthenticated && <NotificationBell />}

        <UserDropdown />

        <div className="md:hidden">
          {isAuthenticated && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>

              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navegación</SheetTitle>
                </SheetHeader>

                <div className="mt-6 flex flex-col gap-4">
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

                  {canAccessSettings(user?.role?.name) && (
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
