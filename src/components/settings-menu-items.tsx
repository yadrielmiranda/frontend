import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import Link from "next/link";
import { Fragment } from "react";
import {
  Boxes,
  Building2,
  Calculator,
  CircleDollarSign,
  Cog,
  DoorOpen,
  Droplets,
  EyeOff,
  FileSliders,
  Layers,
  Palette,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareStack,
  SwatchBook,
  Tags,
  Users,
  Wrench,
  Hammer,
  Link2,
  BadgeDollarSign,
  MapPinned,
  Warehouse,
} from "lucide-react";

import { isAdminRole, type RoleName } from "@/lib/rbac";
import type { CompanyLocale } from "@/components/company/company-content";

const spanishLabels = {
  "Catalog": "Catálogo",
  "Brands": "Marcas",
  "Products": "Productos",
  "Systems": "Sistemas",
  "Configs": "Configuraciones",
  "Config Categories": "Categorías de configuración",
  "Energy Ratings": "Calificaciones energéticas",
  "Options": "Opciones",
  "French Door Designs": "Diseños de French Door",
  "Garage Designs": "Diseños de Garage Door",
  "Door & System Options": "Opciones de puertas y sistemas",
  "Active": "Hoja activa",
  "Preparation": "Preparación",
  "Sill": "Umbral",
  "Reinforcement": "Refuerzo",
  "Muntin Patterns": "Patrones de barras",
  "Muntin Types": "Tipos de barras",
  "Glass & Finishes": "Vidrio y acabados",
  "Frame Colors": "Colores de marco",
  "Coatings": "Recubrimientos",
  "Crystals": "Cristales",
  "Tints": "Tintes",
  "Privacy Options": "Opciones de privacidad",
  "Pricing & Rules": "Precios y reglas",
  "Internal Dealer Earnings Plans": "Planes internos de ganancias para distribuidores",
  "Payment Plans": "Planes de pago",
  "Promotions": "Promociones",
  "Roles & Markups": "Roles y recargos",
  "Pricing Rules": "Reglas de precios",
  "Pricing Ranges": "Rangos de precios",
  "Linear Pricing Rules": "Reglas de precios lineales",
  "Global Parameters": "Parámetros globales",
  "Dimension Policies": "Reglas de dimensiones",
  "Installation": "Instalación",
  "Services & Rules": "Servicios y reglas",
  "Automatic Mappings": "Asignaciones automáticas",
  "Price Profiles": "Perfiles de precios",
  "Installation coverage": "Cobertura de instalación",
  "Administration": "Administración",
  "Referral Rewards": "Recompensas por referidos",
  "Registration Analytics": "Estadísticas de registro",
  "Warehouse & Delivery": "Almacén y entregas",
  "Users": "Usuarios",
  "Company": "Empresa",
  "Terms and Conditions": "Términos y condiciones",
};

export function SettingsMenuItems({
  role,
  locale = "en",
}: {
  role?: RoleName | string | null;
  locale?: CompanyLocale;
}) {
  const isAdmin = isAdminRole(role);
  const t = (label: keyof typeof spanishLabels) =>
    locale === "es" ? spanishLabels[label] : label;

  const itemClass = "cursor-pointer gap-2 rounded-lg";
  const iconClass = "h-4 w-4 text-slate-500";

  return (
    <Fragment>
      {/* Catalog */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t("Catalog")}
      </DropdownMenuLabel>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/brands">
          <Building2 className={iconClass} />
          {t("Brands")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/products">
          <Boxes className={iconClass} />
          {t("Products")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/systems">
          <SquareStack className={iconClass} />
          {t("Systems")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/configs">
          <Layers className={iconClass} />
          {t("Configs")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/config-categories">
          <Tags className={iconClass} />
          {t("Config Categories")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/energy-ratings">
          <Sparkles className={iconClass} />
          {t("Energy Ratings")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Options */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t("Options")}
      </DropdownMenuLabel>

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/french-door-designs">
            <Palette className={iconClass} />
            {t("French Door Designs")}
          </Link>
        </DropdownMenuItem>
      )}

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/garage-designs">
            <Palette className={iconClass} />
            {t("Garage Designs")}
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer gap-2 rounded-lg">
          <SlidersHorizontal className={iconClass} />
          {t("Door & System Options")}
        </DropdownMenuSubTrigger>

        <DropdownMenuSubContent
          lang={locale}
          className="w-60 max-w-[calc(100vw-1rem)] rounded-xl border-slate-200 bg-white p-1 shadow-xl"
        >
          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/active-options">
              <DoorOpen className={iconClass} />
              {t("Active")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/preparation-options">
              <Wrench className={iconClass} />
              {t("Preparation")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/sill-options">
              <FileSliders className={iconClass} />
              {t("Sill")}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/reinforcement-options">
              <ShieldCheck className={iconClass} />
              {t("Reinforcement")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/muntin-patterns">
          <SwatchBook className={iconClass} />
          {t("Muntin Patterns")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/muntin-types">
          <Cog className={iconClass} />
          {t("Muntin Types")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Glass & Finishes */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t("Glass & Finishes")}
      </DropdownMenuLabel>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/framecolors">
          <Palette className={iconClass} />
          {t("Frame Colors")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/coatings">
          <Sparkles className={iconClass} />
          {t("Coatings")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/crystals">
          <Droplets className={iconClass} />
          {t("Crystals")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/tints">
          <Palette className={iconClass} />
          {t("Tints")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/privacies">
          <EyeOff className={iconClass} />
          {t("Privacy Options")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Pricing & Rules */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t("Pricing & Rules")}
      </DropdownMenuLabel>

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/earnings-plans">
            <BadgeDollarSign className={iconClass} />
            {t("Internal Dealer Earnings Plans")}
          </Link>
        </DropdownMenuItem>
      )}

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/payment-plans">
            <BadgeDollarSign className={iconClass} />
            {t("Payment Plans")}
          </Link>
        </DropdownMenuItem>
      )}

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/promotions">
            <CircleDollarSign className={iconClass} />
            {t("Promotions")}
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/roles">
          <CircleDollarSign className={iconClass} />
          {t("Roles & Markups")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/pricing-rules">
          <Calculator className={iconClass} />
          {t("Pricing Rules")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/pricing-ranges">
          <Ruler className={iconClass} />
          {t("Pricing Ranges")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/linear-pricing-rules">
          <Calculator className={iconClass} />
          {t("Linear Pricing Rules")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/global-parameters">
          <Cog className={iconClass} />
          {t("Global Parameters")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/dimension-policies">
          <Ruler className={iconClass} />
          {t("Dimension Policies")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t("Installation")}
      </DropdownMenuLabel>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/installation-services">
          <Hammer className={iconClass} />
          {t("Services & Rules")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/installation-mappings">
          <Link2 className={iconClass} />
          {t("Automatic Mappings")}
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/installation-profiles">
          <BadgeDollarSign className={iconClass} />
          {t("Price Profiles")}
        </Link>
      </DropdownMenuItem>

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/installation-coverage">
            <MapPinned className={iconClass} />
            {t("Installation coverage")}
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator />

      {/* Administración */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {t("Administration")}
      </DropdownMenuLabel>

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/referrals">
            <BadgeDollarSign className={iconClass} />
            {t("Referral Rewards")}
          </Link>
        </DropdownMenuItem>
      )}
      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/registration-analytics">
            <Users className={iconClass} />
            {t("Registration Analytics")}
          </Link>
        </DropdownMenuItem>
      )}

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/warehouse-delivery">
            <Warehouse className={iconClass} />
            {t("Warehouse & Delivery")}
          </Link>
        </DropdownMenuItem>
      )}

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/users">
            <Users className={iconClass} />
            {t("Users")}
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/company-branding">
          <Building2 className={iconClass} />
          {t("Company")}
        </Link>
      </DropdownMenuItem>
      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/platform-terms">
            <FileSliders className={iconClass} />
            {t("Terms and Conditions")}
          </Link>
        </DropdownMenuItem>
      )}
    </Fragment>
  );
}
