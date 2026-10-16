"use client";

import Link from "next/link";
import { ChevronDown, ClipboardCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WarehouseReleaseActions({
  source = "WAREHOUSE", storeId = "all", search = "", poKey, poLabel, compact = false,
}: {
  source?: "WAREHOUSE" | "TRANSIT"; storeId?: string; search?: string;
  poKey?: string; poLabel?: string; compact?: boolean;
}) {
  const query = new URLSearchParams({ source, search });
  if (poKey) query.set("poKey", poKey);
  if (source === "WAREHOUSE" && storeId !== "all" && storeId) query.set("storeId", storeId);
  const customerHref = `/warehouse/customer-deliveries/new?${query}`;
  const compactClass = "mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 underline underline-offset-2";
  if (source === "TRANSIT") return compact
    ? <Link href={customerHref} className={compactClass} aria-label={`Deliver PO ${poLabel} to customer`}>Deliver to customer</Link>
    : <Button asChild variant="outline"><Link href={customerHref}>Deliver to customer</Link></Button>;
  query.delete("source");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? <button type="button" className={compactClass} aria-label={`Release parts for PO ${poLabel}`}>
          Release parts<ChevronDown className="h-3.5 w-3.5" />
        </button> : <Button variant="outline">Release parts<ChevronDown className="ml-2 h-4 w-4" /></Button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "start" : "end"} className="w-72 max-w-[calc(100vw-2rem)] rounded-xl p-2">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Who are these parts for?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="items-start rounded-lg p-3">
          <Link href={customerHref}>
            <ClipboardCheck className="mt-0.5" />
            <span><span className="block font-medium">Deliver to customer</span><span className="mt-1 block text-xs text-muted-foreground">Review and sign a delivery receipt.</span></span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="items-start rounded-lg p-3">
          <Link href={`/warehouse/releases/new?${query}`}>
            <Wrench className="mt-0.5" />
            <span><span className="block font-medium">Release to installation</span><span className="mt-1 block text-xs text-muted-foreground">Choose POs and quantities. No signature.</span></span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
