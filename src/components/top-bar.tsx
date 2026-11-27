"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import { PortalLanguageSwitch } from "@/components/portal-language-switch";
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
import { Menu, FileText, ShoppingBag, ShoppingCart, Settings, Hammer, Warehouse, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import brandLogo from "../../public/logo.png";
import { NotificationBell } from "./notifications-bell";
import { canAccessSettings, canAccessWarehouse } from "@/lib/rbac";
import { usePathname } from "next/navigation";
import { useCompanyBranding } from "@/contexts/CompanyBrandingContext";

const navigationCopy = {
  en: {
    portal: "Impact Windows Portal", navigation: "Navigation", open: "Open navigation menu", close: "Close menu",
    estimates: "Estimates", installations: "Installations", orders: "Orders", materials: "Materials",
    myDealers: "My dealers", dealerNetwork: "Dealer network", warehouse: "Warehouse", settings: "Settings",
  },
  es: {
    portal: "Portal de ventanas de impacto", navigation: "Navegación", open: "Abrir menú de navegación", close: "Cerrar menú",
    estimates: "Cotizaciones", installations: "Instalaciones", orders: "Órdenes", materials: "Materiales",
    myDealers: "Mis distribuidores", dealerNetwork: "Red de distribuidores", warehouse: "Almacén", settings: "Configuración",
  },
};

function TopBar() {
  const { isAuthenticated, user } = useAuth();
  const { companyName } = useCompanyBranding();
  const { locale, saving, changeLanguage } = usePortalLanguage();
  const copy = navigationCopy[locale];
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pathname = usePathname();

  const role = user?.role?.name;
  const links = [
    { href: "/estimates", label: copy.estimates, icon: FileText },
    { href: "/installations", label: copy.installations, icon: Hammer },
    { href: "/orders", label: copy.orders, icon: ShoppingBag },
    { href: "/materials", label: copy.materials, icon: ShoppingCart },
    { href: "/dealers", label: role === "dealer" ? copy.myDealers : copy.dealerNetwork, icon: Users, visible: ["dealer", "admin", "operator"].includes(role ?? "") },
    { href: "/warehouse", label: copy.warehouse, icon: Warehouse, visible: canAccessWarehouse(role) },
  ].filter(link => link.visible !== false);
  const isSettingsActive = pathname.startsWith("/settings");
  const hasStaffNavigation = canAccessWarehouse(role) || canAccessSettings(role);
  const desktopMenuVisibility = hasStaffNavigation ? "hidden 2xl:flex" : "hidden xl:flex";
  const mobileMenuVisibility = hasStaffNavigation ? "2xl:hidden" : "xl:hidden";

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

  const brand = (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- Reload the entire dashboard on every logo click, including from home.
    <a
      href="/"
      className="group flex min-w-0 items-center gap-1.5 rounded-2xl py-1 transition hover:bg-white/10 sm:gap-3 sm:px-2"
    >
      <Image
        src={brandLogo}
        alt=""
        width={52}
        height={52}
        className="h-11 w-auto shrink-0 -translate-y-0.5 object-contain transition group-hover:scale-[1.02] sm:h-14"
        style={{
          filter:
            "drop-shadow(0 0 1px rgba(226, 232, 240, 0.8)) drop-shadow(0 0 3px rgba(226, 232, 240, 0.3)) drop-shadow(0 5px 3px rgba(0, 0, 0, 0.8))",
        }}
        priority
      />

      <div className="min-w-0 leading-tight">
        <h1 className="line-clamp-2 text-sm font-bold tracking-tight text-white sm:truncate sm:text-xl">
          {companyName}
        </h1>
        <p className="hidden truncate text-xs font-medium text-white/50 xl:block">
          {copy.portal}
        </p>
      </div>
    </a>
  );

  if (!mounted) {
    return (
      <header data-app-header lang={locale} className="sticky top-0 z-50 bg-slate-950/95 shadow-[0_12px_35px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          {brand}

          <div className="flex items-center gap-4">
            <div className={`h-9 w-28 animate-pulse rounded-xl bg-slate-200 ${desktopMenuVisibility}`} />
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            <div className={`h-9 w-9 animate-pulse rounded-xl bg-slate-200 ${mobileMenuVisibility}`} />
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500 to-transparent" />
      </header>
    );
  }

  return (
    <header data-app-header lang={locale} className="sticky top-0 z-50 bg-slate-950/95 shadow-[0_12px_35px_rgba(2,6,23,0.28)] backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between gap-1 px-2 sm:gap-2 sm:px-6 lg:px-8">
        {brand}

        {isAuthenticated && (
          <nav aria-label={copy.navigation} className={`shrink-0 items-center gap-1 ${desktopMenuVisibility}`}>
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Button key={href} variant="ghost" className={navButtonClass(active)} asChild>
                  <Link href={href} aria-current={active ? "location" : undefined}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </Button>
              );
            })}

            {canAccessSettings(role) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={navButtonClass(isSettingsActive)}
                  >
                    <Settings className="h-4 w-4" />
                    {copy.settings}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent lang={locale} className="w-64" align="center">
                  <SettingsMenuItems role={role} locale={locale} />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <div className={mobileMenuVisibility}>
            {isAuthenticated && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
                    aria-label={copy.open}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="left" lang={locale} closeLabel={copy.close} aria-describedby={undefined}>
                  <SheetHeader>
                    <SheetTitle>{copy.navigation}</SheetTitle>
                  </SheetHeader>

                  <nav aria-label={copy.navigation} className="mt-6 flex flex-col gap-3 overflow-y-auto">
                    {links.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Button key={href} variant="ghost" className={`w-full justify-start ${mobileNavButtonClass(active)}`} asChild>
                          <Link href={href} aria-current={active ? "location" : undefined}>
                            <Icon className="mr-2 h-4 w-4" />
                            {label}
                          </Link>
                        </Button>
                      );
                    })}

                    {canAccessSettings(role) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start ${mobileNavButtonClass(isSettingsActive)}`}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            {copy.settings}
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent lang={locale} className="w-56">
                          <SettingsMenuItems role={role} locale={locale} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {isAuthenticated && (
            <>
              <PortalLanguageSwitch locale={locale} saving={saving} onChange={changeLanguage} />
              <NotificationBell locale={locale} />
            </>
          )}

          <UserDropdown locale={locale} />
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-red-600/80 to-transparent" />
    </header>
  );
}

export default TopBar;
