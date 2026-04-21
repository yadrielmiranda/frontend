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
import { isAdminRole, type RoleName } from "@/lib/rbac";

export function SettingsMenuItems({
  role,
}: {
  role?: RoleName | string | null;
}) {
  return (
    <Fragment>
      <DropdownMenuLabel className="text-red-500">
        Admin Settings
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

      {/* ✅ AGRUPACIÓN DE OPTIONS */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Options</DropdownMenuSubTrigger>

        <DropdownMenuSubContent>
          <DropdownMenuItem asChild>
            <Link href="/settings/active-options">Active</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings/preparation-options">
              Preparation
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings/sill-options">Sill</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings/reinforcement-options">
              Reinforcement
            </Link>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* ✅ Muntin */}
      <DropdownMenuItem asChild>
        <Link href="/settings/muntin-patterns">Muntin Patterns</Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/muntin-types">Muntin Types</Link>
      </DropdownMenuItem>

      {/* ✅ Otros */}
      <DropdownMenuItem asChild>
        <Link href="/settings/framecolors">Frame Colors</Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/coatings">Coatings</Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/crystals">Crystals</Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/tints">Tints</Link>
      </DropdownMenuItem>

      {/* ✅ Solo admin ve Users */}
      {isAdminRole(role) && (
        <DropdownMenuItem asChild>
          <Link href="/settings/users">Users</Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem asChild>
        <Link href="/settings/roles">Roles & Markups</Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/pricing-rules">Pricing Rules</Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/global-parameters">
          Global Parameters
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/dimension-policies">
          Dimension Policies
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link href="/settings/company-branding">Company</Link>
      </DropdownMenuItem>
    </Fragment>
  );
}