"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ScanBarcode, History, ClipboardCheck, PackageCheck, Warehouse } from "lucide-react";

const links = [
  { href: "/warehouse", label: "Inventory", icon: Boxes },
  { href: "/warehouse/receipts", label: "Pending receipt", icon: PackageCheck },
  { href: "/warehouse/stores", label: "Stores", icon: Warehouse },
  { href: "/warehouse/scan", label: "Scan", icon: ScanBarcode },
  { href: "/warehouse/history", label: "History", icon: History },
  { href: "/warehouse/counts", label: "Physical counts", icon: ClipboardCheck },
];
export function WarehouseNavigation() {
  const path = usePathname();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouse</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track physical parts from factory collection to warehouse release.
        </p>
      </div>
      <nav
        aria-label="Warehouse sections"
        className="flex flex-wrap gap-2 border-b pb-4"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/warehouse" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
