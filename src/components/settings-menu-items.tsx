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
} from "lucide-react";

import { isAdminRole, type RoleName } from "@/lib/rbac";

export function SettingsMenuItems({
  role,
}: {
  role?: RoleName | string | null;
}) {
  const isAdmin = isAdminRole(role);

  const itemClass = "cursor-pointer gap-2 rounded-lg";
  const iconClass = "h-4 w-4 text-slate-500";

  return (
    <Fragment>
      {/* Catalog */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Catalog
      </DropdownMenuLabel>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/brands">
          <Building2 className={iconClass} />
          Brands
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/products">
          <Boxes className={iconClass} />
          Products
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/systems">
          <SquareStack className={iconClass} />
          Systems
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/configs">
          <Layers className={iconClass} />
          Configs
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/config-categories">
          <Tags className={iconClass} />
          Config Categories
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Options */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Options
      </DropdownMenuLabel>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer gap-2 rounded-lg">
          <SlidersHorizontal className={iconClass} />
          Door & System Options
        </DropdownMenuSubTrigger>

        <DropdownMenuSubContent className="w-60 rounded-xl border-slate-200 bg-white p-1 shadow-xl">
          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/active-options">
              <DoorOpen className={iconClass} />
              Active
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/preparation-options">
              <Wrench className={iconClass} />
              Preparation
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/sill-options">
              <FileSliders className={iconClass} />
              Sill
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/settings/reinforcement-options">
              <ShieldCheck className={iconClass} />
              Reinforcement
            </Link>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/muntin-patterns">
          <SwatchBook className={iconClass} />
          Muntin Patterns
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/muntin-types">
          <Cog className={iconClass} />
          Muntin Types
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Glass & Finishes */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Glass & Finishes
      </DropdownMenuLabel>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/framecolors">
          <Palette className={iconClass} />
          Frame Colors
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/coatings">
          <Sparkles className={iconClass} />
          Coatings
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/crystals">
          <Droplets className={iconClass} />
          Crystals
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/tints">
          <Palette className={iconClass} />
          Tints
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Pricing & Rules */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Pricing & Rules
      </DropdownMenuLabel>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/roles">
          <CircleDollarSign className={iconClass} />
          Roles & Markups
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/pricing-rules">
          <Calculator className={iconClass} />
          Pricing Rules
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/global-parameters">
          <Cog className={iconClass} />
          Global Parameters
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/dimension-policies">
          <Ruler className={iconClass} />
          Dimension Policies
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {/* Administration */}
      <DropdownMenuLabel className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Administration
      </DropdownMenuLabel>

      {isAdmin && (
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings/users">
            <Users className={iconClass} />
            Users
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/company-branding">
          <Building2 className={iconClass} />
          Company
        </Link>
      </DropdownMenuItem>
    </Fragment>
  );
}
