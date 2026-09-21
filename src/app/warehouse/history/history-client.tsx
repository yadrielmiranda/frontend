"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  warehouseHistory,
  type Paged,
  type WarehouseMovement,
} from "@/app/api/warehouse.api";
import {
  dateLabel,
  errorMessage,
  movementLabels,
  Pagination,
} from "../warehouse-shared";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
export function HistoryClient({
  initial,
  lineNumber,
}: {
  initial: Paged<WarehouseMovement>;
  lineNumber: string;
}) {
  const [data, setData] = useState(initial),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const serial = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++serial.current;
    setBusy(true);
    try {
      const result = await warehouseHistory({
        page,
        search,
        lineNumber: lineNumber || undefined,
      });
      if (current === serial.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (current === serial.current) setError(errorMessage(e));
    } finally {
      if (current === serial.current) setBusy(false);
    }
  }, [page, search, lineNumber]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 200);
    return () => {
      clearTimeout(timer);
      serial.current++;
    };
  }, [refresh]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Movement history{lineNumber ? ` · ${lineNumber}` : ""}
        </h2>
        <Button variant="outline" onClick={refresh} disabled={busy}>
          Refresh
        </Button>
      </div>
      {lineNumber ? (
        <Link
          className="text-sm text-red-700 underline"
          href="/warehouse/history"
        >
          Show all movements
        </Link>
      ) : (
        <Input
          aria-label="Search movement history"
          placeholder="Order, customer, mark, PO or barcode"
          maxLength={150}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="divide-y overflow-hidden rounded-xl border bg-white">
        {data.items.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No movements found.
          </p>
        )}
        {data.items.map((m) => (
          <article key={m.id} className="space-y-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {movementLabels[m.type]}
                  {m.reversed ? " · Reversed" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateLabel(m.createdAt)} · {m.actor} · Movement #{m.id}
                </p>
              </div>
              <Link
                className="font-mono text-sm text-red-700 underline"
                href={`/warehouse?view=all&search=${m.lineNumber}`}
              >
                I{m.lineNumber}
              </Link>
            </div>
            {m.type === "COUNT" || m.type === "COUNT_UNDO" ? (
              <p className="text-sm">
                Counted: {signed(m.countDelta)} · Stock unchanged
              </p>
            ) : m.type === "PARTS" ? (
              <p className="text-sm">
                Expected parts: {m.expectedPartsBefore ?? "Not set"} →{" "}
                {m.expectedPartsAfter}
              </p>
            ) : (
              <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span>
                  Transit {signed(m.transitDelta)} → {m.transitAfter}
                </span>
                <span>
                  Warehouse {signed(m.onHandDelta)} → {m.onHandAfter}
                </span>
                <span>
                  Released {signed(m.releasedDelta)} → {m.releasedAfter}
                </span>
              </p>
            )}
            {m.reason && (
              <p className="break-words text-sm text-muted-foreground">
                {m.reason}
              </p>
            )}
            {m.reversalOfId && (
              <p className="text-xs text-muted-foreground">
                Reverses movement #{m.reversalOfId}.
              </p>
            )}
            {m.countId && (
              <Link
                className="text-xs text-red-700 underline"
                href={`/warehouse/counts/${m.countId}`}
              >
                Physical count #{m.countId}
              </Link>
            )}
          </article>
        ))}
      </div>
      <Pagination {...data} onPage={setPage} disabled={busy} />
    </div>
  );
}
