"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import {
  getWarehousePickupAddress,
  type WarehouseAddress,
} from "@/app/api/warehouse-delivery.api";

export function WarehousePickupAddress() {
  const [address, setAddress] = useState<WarehouseAddress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getWarehousePickupAddress()
      .then((value) => {
        if (active) setAddress(value);
      })
      .catch(() => {
        if (active) setAddress(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm" aria-live="polite">
      <strong className="flex items-center gap-2">
        <MapPin className="h-4 w-4" /> Pickup address
      </strong>
      <p className="mt-1 text-muted-foreground">
        {loading
          ? "Loading pickup address..."
          : address
            ? `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`
            : "Contact us to confirm the pickup address."}
      </p>
    </div>
  );
}
