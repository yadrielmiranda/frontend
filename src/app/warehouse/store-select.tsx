"use client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { WarehouseStoreRef } from "@/app/api/warehouse.api";

export function StoreSelect({
  stores, value, onChange, disabled, allowUnassigned = false, allowAll = false,
  includeInactive = false, label = "Store", placeholder = "Choose a store",
}: {
  stores: WarehouseStoreRef[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowUnassigned?: boolean;
  allowAll?: boolean;
  includeInactive?: boolean;
  label?: string;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="w-full sm:min-w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">All stores</SelectItem>}
        {allowUnassigned && <SelectItem value="unassigned">Unassigned</SelectItem>}
        {stores.filter((s) => includeInactive || s.isActive).map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.name}{!s.isActive ? " (inactive)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
