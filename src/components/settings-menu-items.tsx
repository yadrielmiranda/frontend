import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Fragment } from "react";
import { isAdmin, type RoleName } from "@/lib/rbac";

export function SettingsMenuItems({ role }: { role?: RoleName | string | null }) {
  return (
    <Fragment>
      <DropdownMenuLabel className="text-red-500">Admin Settings</DropdownMenuLabel>
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
        <Link href="/settings/coatings">Coatings</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/crystals">Crystals</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/tints">Tints</Link>
      </DropdownMenuItem>

      {/* ✅ Solo admin ve Users */}
      {isAdmin(role) && (
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
        <Link href="/settings/global-parameters">Global Parameters</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/dimension-policies">Dimension Policies</Link>
      </DropdownMenuItem>
    </Fragment>
  );
}
