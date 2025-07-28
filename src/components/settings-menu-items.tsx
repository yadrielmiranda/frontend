import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Fragment } from "react";

export function SettingsMenuItems() {
  return (
    <Fragment>
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
        <Link href="/settings/coatings">Coatings</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/crystals">Crystals</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/tints">Tints</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings/users">Users</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/estimates">Estimates</Link>
      </DropdownMenuItem>      
      <DropdownMenuItem asChild>
        <Link href="/orders">Orders</Link>
      </DropdownMenuItem>
      <DropdownMenuItem>Tiempo Registrado</DropdownMenuItem>
      <DropdownMenuItem>Cargas de Trabajo</DropdownMenuItem>
    </Fragment>
  );
}
