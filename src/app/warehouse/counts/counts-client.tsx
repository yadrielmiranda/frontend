"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StoreSelect } from "../store-select";
import { Button } from "@/components/ui/button";
import {
  warehouseCounts,
  warehouseStartCount,
  warehouseRequestKey,
  type CountInfo,
  type WarehouseStore,
} from "@/app/api/warehouse.api";
import { dateLabel, errorMessage, countLocation } from "../warehouse-shared";

export function CountsClient({ initial, initialStores }: { initial: CountInfo[]; initialStores: WarehouseStore[] }) {
  const router = useRouter(),
    key = useRef("");
  const [counts, setCounts] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const open = counts.find((c) => c.status === "OPEN");
  async function start() {
    setBusy(true);
    setError("");
    if (!key.current) key.current = warehouseRequestKey();
    try {
      const result = await warehouseStartCount(key.current, location === "unassigned" ? "UNASSIGNED" : "STORE", location === "unassigned" ? null : Number(location));
      router.push(`/warehouse/counts/${result.id}`);
    } catch (e) {
      setError(errorMessage(e));
      warehouseCounts()
        .then(setCounts)
        .catch(() => undefined);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Physical inventory counts</h2>
      <div className="space-y-3 rounded-xl border bg-white p-5">
        <p className="text-sm text-muted-foreground">
          Scan what is physically in the warehouse and compare it with recorded
          stock for the selected location only. Starting a count pauses stock movements until the count is
          completed or canceled. Count readings do not receive any stock.
        </p>
        {open ? (
          <Button asChild>
            <Link href={`/warehouse/counts/${open.id}`}>
              Continue count #{open.id}
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <div className="w-full sm:max-w-xs"><StoreSelect stores={initialStores} value={location}
              onChange={(value) => { setLocation(value); key.current = ""; }} allowUnassigned disabled={busy}
              label="Physical count location" placeholder="Choose the location to count" /></div>
            <Button onClick={start} disabled={busy || !location}>
              {busy ? "Starting…" : "Start physical count"}
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="divide-y rounded-xl border bg-white">
        {counts.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No physical counts yet.
          </p>
        ) : (
          counts.map((c) => (
            <Link
              key={c.id}
              href={`/warehouse/counts/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium">Count #{c.id} · {countLocation(c)}</p>
                <p className="text-xs text-muted-foreground">
                  {dateLabel(c.startedAt)} · {c.startedBy.firstName}{" "}
                  {c.startedBy.lastName}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${c.status === "OPEN" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
              >
                {c.status === "OPEN"
                  ? "In progress"
                  : c.status === "COMPLETED"
                    ? "Completed"
                    : "Canceled"}
              </span>
            </Link>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Latest 50 counts. Each completed adjustment remains in movement history.
      </p>
    </div>
  );
}
