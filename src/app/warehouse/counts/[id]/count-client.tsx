"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  warehouseCount,
  warehouseCountScan,
  warehouseCloseCount,
  warehouseUndo,
  warehouseRequestKey,
  type PhysicalCount,
  type ScanResult,
} from "@/app/api/warehouse.api";
import { ScanPad } from "../../scan-pad";
import { dateLabel, errorMessage, Pagination, countLocation } from "../../warehouse-shared";

export function CountClient({
  initial,
  admin,
  actorId,
}: {
  initial: PhysicalCount;
  admin: boolean;
  actorId: number;
}) {
  const [data, setData] = useState(initial),
    [last, setLast] = useState<ScanResult | null>(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [differences, setDifferences] = useState(false);
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [reviewed, setReviewed] = useState(false);
  const serial = useRef(0),
    revision = useRef(initial.revision),
    undoKey = useRef("");
  const open = data.status === "OPEN";
  const refresh = useCallback(async () => {
    const seq = ++serial.current;
    try {
      const next = await warehouseCount(initial.id, {
        page,
        search,
        differences,
      });
      if (seq === serial.current) {
        if (revision.current !== next.revision) setReviewed(false);
        revision.current = next.revision;
        setData(next);
      }
    } catch (e) {
      if (seq === serial.current) setError(errorMessage(e));
    }
  }, [initial.id, page, search, differences]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 200);
    return () => {
      clearTimeout(timer);
      serial.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [open, refresh]);
  async function close(action: "COMPLETE" | "CANCEL") {
    setBusy(true);
    setError("");
    try {
      await warehouseCloseCount(
        data.id,
        action,
        reason.trim() || undefined,
        data.revision,
      );
      setLast(null);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function undo() {
    if (!last) return;
    setBusy(true);
    setError("");
    if (!undoKey.current) undoKey.current = warehouseRequestKey();
    try {
      await warehouseUndo(last.movement.id, undoKey.current);
      setLast(null);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Physical count #{data.id} · {countLocation(data)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Started {dateLabel(data.startedAt)} · {data.startedBy.firstName}{" "}
            {data.startedBy.lastName}
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={busy || pending}>
          Refresh
        </Button>
      </div>
      <p
        role="status"
        className={`rounded-xl border p-4 text-sm ${open ? "border-amber-200 bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}
      >
        {open
          ? `Stock movements are paused while this count is open. Scan every physical part in ${countLocation(data)} once. Do not include parts in other locations.`
          : data.status === "COMPLETED"
            ? "Count completed. Approved differences were recorded as inventory adjustments."
            : "Count canceled. Stock was not changed."}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Recorded parts", data.expected],
          ["Counted parts", data.counted],
          ["Units with differences", data.differences],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {open && (
        <ScanPad
          scope={`count:${data.id}`}
          disabled={busy}
          onPendingChange={setPending}
          onRead={(barcode, key) => warehouseCountScan(data.id, barcode, key)}
          onSaved={(result) => {
            setLast(result);
            undoKey.current = "";
            setReviewed(false);
            setError("");
            void refresh();
          }}
        />
      )}
      {last && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p role="status" className="text-sm text-emerald-900">
            {last.stock.mark} · {last.stock.product} {last.stock.configuration}{" "}
            · {last.counted} {last.counted === 1 ? "part" : "parts"} counted for
            I{last.stock.lineNumber}. Stock unchanged.
            {last.replayed ? " This reading was already recorded." : ""}
          </p>
          <Button variant="outline" onClick={undo} disabled={busy || pending}>
            Undo last count reading
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="sm:max-w-sm"
          aria-label="Search physical count"
          placeholder="Order, mark, customer or barcode"
          value={search}
          maxLength={150}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={differences}
            onChange={(e) => {
              setDifferences(e.target.checked);
              setPage(1);
            }}
          />
          Only differences
        </label>
      </div>
      <div className="divide-y rounded-xl border bg-white">
        {data.items.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No units in this view.
          </p>
        )}
        {data.items.map((row) => (
          <article
            className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            key={row.stock.lineNumber}
          >
            <div>
              <p className="font-medium">
                {row.stock.mark} · {row.stock.product} {row.stock.configuration}
              </p>
              <p className="text-xs text-muted-foreground">
                I{row.stock.lineNumber} · Order #{row.stock.orderNumber} ·{" "}
                {row.stock.customer}
              </p>
            </div>
            <div className="flex gap-5 text-sm">
              <span>
                Recorded <b>{row.expected}</b>
              </span>
              <span>
                Counted <b>{row.counted}</b>
              </span>
              <span
                className={
                  row.difference ? "text-amber-700" : "text-emerald-700"
                }
              >
                Difference{" "}
                <b>
                  {row.difference > 0 ? "+" : ""}
                  {row.difference}
                </b>
              </span>
            </div>
          </article>
        ))}
      </div>
      <Pagination {...data} onPage={setPage} disabled={busy || pending} />
      {open && (
        <div className="space-y-4 rounded-xl border bg-white p-5">
          <h3 className="font-semibold">Review and close</h3>
          <p className="text-sm text-muted-foreground">
            Recorded parts that were not scanned count as missing. Review every
            difference before completing the count. An administrator must
            approve inventory adjustments.
          </p>
          {data.differences > 0 && admin && (
            <>
              <Label htmlFor="count-reason">
                Reason for inventory adjustments
              </Label>
              <Input
                id="count-reason"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy || pending}
              />
            </>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={busy || pending}
            />
            <span>I finished counting and reviewed all differences.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => close("COMPLETE")}
              disabled={
                busy ||
                pending ||
                !reviewed ||
                (data.differences > 0 && (!admin || reason.trim().length < 3))
              }
            >
              {busy
                ? "Saving…"
                : data.differences
                  ? "Apply adjustments and complete"
                  : "Complete count"}
            </Button>
            {(admin || actorId === data.startedBy.id) && (
              <Button
                variant="outline"
                onClick={() => close("CANCEL")}
                disabled={busy || pending}
              >
                Cancel count without adjustments
              </Button>
            )}
          </div>
          {data.differences > 0 && !admin && (
            <p className="text-sm text-amber-800">
              An administrator can review and close this count from Warehouse →
              Physical counts.
            </p>
          )}
        </div>
      )}
      {data.reason && !open && (
        <p className="break-words text-sm text-muted-foreground">
          Closing note: {data.reason}
        </p>
      )}
      <Link
        href="/warehouse"
        className="text-sm font-medium text-red-700 underline"
      >
        Back to inventory
      </Link>
    </div>
  );
}
