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
import { Menu, FileText, ShoppingBag, Settings } from "lucide-react";
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

  const isEstimatesActive = pathname.startsWith("/estimates");
  const isOrdersActive = pathname.startsWith("/orders");
  const isSettingsActive = pathname.startsWith("/settings");

  const navButtonClass = (active: boolean) =>
    active
      ? "bg-red-600/15 text-red-300 ring-1 ring-red-500/30 hover:bg-red-600/20 hover:text-red-200"
      : "text-white/75 hover:bg-white/10 hover:text-white";

  const mobileNavButtonClass = (active: boolean) =>
    active
      ? "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const Brand = () => (
    <Link
      href="/"
      className="group flex items-center gap-3 rounded-2xl px-2 py-1 transition hover:bg-white/10"
    >
      <Image
        src="/logo.png"
        alt="Authentic Evolution"
        width={52}
        height={52}
        className="h-14 w-auto object-contain transition group-hover:scale-[1.02]"
        priority
      />

      <div className="leading-tight">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Authentic Evolution
        </h1>
        <p className="hidden text-xs font-medium text-white/50 sm:block">
          Impact Windows Portal
        </p>
      </div>
    </Link>
  );

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-slate-950/95 shadow-[0_12px_35px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Brand />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden h-9 w-28 animate-pulse rounded-xl bg-slate-200 md:block" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200 md:hidden" />
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 shadow-[0_12px_35px_rgba(2,6,23,0.28)] backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Brand />
        </div>

        {isAuthenticated && (
          <nav className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              className={navButtonClass(isEstimatesActive)}
              asChild
            >
              <Link href="/estimates">
                <FileText className="mr-2 h-4 w-4" />
                Estimates
              </Link>
            </Button>

            <Button
              variant="ghost"
              className={navButtonClass(isOrdersActive)}
              asChild
            >
              <Link href="/orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Orders
              </Link>
            </Button>

            {canAccessSettings(user?.role?.name) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={navButtonClass(isSettingsActive)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-64" align="center">
                  <SettingsMenuItems role={user?.role?.name} />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="md:hidden">
            {isAuthenticated && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 flex flex-col gap-3">
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${mobileNavButtonClass(isEstimatesActive)}`}
                      asChild
                    >
                      <Link href="/estimates">
                        <FileText className="mr-2 h-4 w-4" />
                        Estimates
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${mobileNavButtonClass(isOrdersActive)}`}
                      asChild
                    >
                      <Link href="/orders">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Orders
                      </Link>
                    </Button>

                    {canAccessSettings(user?.role?.name) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start ${mobileNavButtonClass(isSettingsActive)}`}
                          >
                            <Settings className="mr-2 h-4 w-4" />
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

          {isAuthenticated && <NotificationBell />}

          <UserDropdown />
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-red-600/80 to-transparent" />
    </header>
  );
}

export default TopBar;
