"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileJson,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/formatters";
import { isApiError } from "@/app/api/_base";
import {
  confirmFactoryImport,
  getFactoryImport,
  previewFactoryImport,
  type FactoryImportContext,
  type FactoryImportPreview,
  type FactoryPiece,
} from "@/app/api/factory-import.api";

const pieceLabel = (piece: FactoryPiece) =>
  `${piece.mark || "No mark"} · ${piece.product} · ${piece.system} · ${piece.configuration} · ${piece.width ?? "—"} × ${piece.height ?? "—"} · ${piece.frameColor}${piece.active ? " · " + piece.active : ""}`;

export function FactoryImportClient({
  initial,
}: {
  initial: FactoryImportContext;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [context, setContext] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FactoryImportPreview | null>(null);
  const [assignments, setAssignments] = useState<Record<string, number | null>>(
    {},
  );
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [page, setPage] = useState(0);
  const data = preview ?? context;
  const piecesById = useMemo(
    () => new Map(data.pieces.map((piece) => [piece.id, piece])),
    [data.pieces],
  );
  const manual = (line: FactoryImportPreview["lines"][number]) =>
    line.issues.length > 0 || assignments[line.lineNumber] !== line.pieceId;
  const counts = new Map<number, number>();
  for (const id of Object.values(assignments))
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  const unresolved =
    preview?.lines.filter((line) => !assignments[line.lineNumber]).length ?? 0;
  const over = preview
    ? data.pieces.filter((piece) => (counts.get(piece.id) ?? 0) > piece.qty)
    : [];
  const missing = preview
    ? data.pieces.filter((piece) => (counts.get(piece.id) ?? 0) < piece.qty)
    : [];
  const needsReview = Boolean(
    preview && (preview.lines.some(manual) || missing.length),
  );
  const reviewCount = preview?.lines.filter(manual).length ?? 0;
  const visible =
    preview?.lines.filter((line) => !onlyReview || manual(line)) ?? [];
  const pageCount = Math.max(1, Math.ceil(visible.length / 50));
  const currentPage = Math.min(page, pageCount - 1);

  async function loadPreview() {
    if (!file) return;
    setBusy(true);
    setError("");
    setSuccess("");
    setPreview(null);
    setReviewed(false);
    try {
      const next = await previewFactoryImport(context.order.id, file);
      setPreview(next);
      setAssignments(
        Object.fromEntries(
          next.lines.map((line) => [line.lineNumber, line.pieceId]),
        ),
      );
      setOnlyReview(false);
      setPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to preview this file.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (
      !preview ||
      !file ||
      unresolved ||
      over.length ||
      (needsReview && !reviewed)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await confirmFactoryImport(
        context.order.id,
        file,
        preview.revision,
        preview.lines.map((line) => ({
          lineNumber: line.lineNumber,
          pieceId: assignments[line.lineNumber]!,
        })),
        reviewed,
      );
      const message = result.unchanged
        ? "This file is already imported. No changes were needed."
        : `Factory order imported. ${result.addedUnits} new unit links saved.`;
      // El guardado ya terminó: un fallo de refresco no debe invitar a repetirlo.
      setSuccess(message);
      toast.success(message);
      setContext({
        ...preview,
        order: {
          ...preview.order,
          poNumber: preview.document.poNumber,
          factoryCost: preview.document.factoryCost,
        },
        linkedUnits: result.linkedUnits,
        pieces: preview.pieces.map((piece) => ({
          ...piece,
          lineNumbers: preview.lines
            .filter((line) => assignments[line.lineNumber] === piece.id)
            .map((line) => line.lineNumber),
        })),
      });
      setPreview(null);
      setFile(null);
      setAssignments({});
      setReviewed(false);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
      getFactoryImport(context.order.id)
        .then(setContext)
        .catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import this file.");
      if (isApiError(e) && e.status === 409) setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Import factory order
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Order #{context.order.number} · {context.order.name}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/orders/${context.order.id}`}>Back to Order</Link>
        </Button>
      </div>
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Factory PO</p>
            <p className="mt-1 font-semibold">
              {data.order.poNumber || "Not imported"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Real factory cost</p>
            <p className="mt-1 font-semibold">
              {data.order.factoryCost === null
                ? "—"
                : formatMoney(Number(data.order.factoryCost))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Units linked</p>
            <p className="mt-1 font-semibold">
              {data.linkedUnits} / {data.expectedUnits}
            </p>
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          <h2 className="font-semibold">Factory JSON</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose the ECO purchase-order export to review the PO, factory cost,
          and unit matches.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="factory-json">JSON file</Label>
            <Input
              ref={fileInput}
              id="factory-json"
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setPreview(null);
                setAssignments({});
                setReviewed(false);
                setError("");
                setSuccess("");
                if (next && next.size > 5 * 1024 * 1024) {
                  setFile(null);
                  setError("Choose a JSON file of 5 MB or smaller.");
                  return;
                }
                setFile(next);
              }}
            />
          </div>
          <Button onClick={loadPreview} disabled={!file || busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Preview import
          </Button>
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}
      {preview && (
        <>
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Review import</h2>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Factory PO to save</p>
                <p className="mt-1 font-semibold">
                  {preview.document.poNumber}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Factory cost to save</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(Number(preview.document.factoryCost))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview.document.factoryCost} USD
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Factory units</p>
                <p className="mt-1 font-semibold">
                  {preview.lines.length} / {preview.expectedUnits} expected
                </p>
              </div>
            </div>
            {preview.document.orderName && (
              <p className="mt-3 text-sm text-muted-foreground">
                Factory order: {preview.document.orderName}
              </p>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Units will be linked to this order and remain pending receipt.
            </p>
          </section>
          <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h2 className="font-semibold">Unit matches</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyReview}
                  onChange={(event) => {
                    setOnlyReview(event.target.checked);
                    setPage(0);
                  }}
                />
                Show review only ({reviewCount})
              </label>
            </div>
            <div className="divide-y">
              {visible
                .slice(currentPage * 50, (currentPage + 1) * 50)
                .map((line) => {
                  const id = assignments[line.lineNumber];
                  const piece = id ? piecesById.get(id) : undefined;
                  const requiresReview = manual(line);
                  return (
                    <div
                      key={line.lineNumber}
                      className="grid gap-4 p-4 lg:grid-cols-2"
                    >
                      <div className="min-w-0 space-y-1 text-sm">
                        <p className="font-semibold">
                          Line {line.lineNumber} · {line.mark || "No mark"}
                        </p>
                        <p className="break-words">{line.description}</p>
                        <p className="text-muted-foreground">
                          {line.size || "Dimensions unavailable"}
                          {line.frameColor ? ` · ${line.frameColor}` : ""}
                        </p>
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Label htmlFor={`match-${line.lineNumber}`}>
                          Our piece
                        </Label>
                        <Select
                          value={id ? String(id) : ""}
                          disabled={busy || line.existing}
                          onValueChange={(value) => {
                            setAssignments((previous) => ({
                              ...previous,
                              [line.lineNumber]: Number(value),
                            }));
                            setReviewed(false);
                          }}
                        >
                          <SelectTrigger
                            id={`match-${line.lineNumber}`}
                            className="w-full min-w-0 [&>span]:truncate"
                          >
                            <SelectValue placeholder="Select a piece..." />
                          </SelectTrigger>
                          <SelectContent className="max-w-[min(90vw,700px)]">
                            {data.pieces.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={String(option.id)}
                              >
                                {pieceLabel(option)} · Qty {option.qty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {piece && (
                          <p className="break-words text-xs text-muted-foreground">
                            {pieceLabel(piece)} · Linked{" "}
                            {counts.get(piece.id) ?? 0} / {piece.qty}
                          </p>
                        )}
                        <p
                          className={`text-xs ${requiresReview ? "text-amber-800" : "text-emerald-700"}`}
                        >
                          {line.existing
                            ? "Previously imported — association preserved."
                            : requiresReview
                              ? piece
                                ? "Manual match — review the characteristics."
                                : line.issues.join(" ")
                              : "Matched automatically"}
                        </p>
                        {line.existing && line.issues.length > 0 && (
                          <p className="text-xs text-amber-800">
                            {line.issues.join(". ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              {onlyReview && reviewCount === 0 && (
                <p className="p-5 text-sm text-muted-foreground">
                  All units matched automatically.
                </p>
              )}
            </div>
            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-3 border-t p-4 text-sm">
                <span>
                  Page {currentPage + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage + 1 === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </section>
          <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
            {unresolved > 0 && (
              <p className="text-sm text-amber-800">
                Select a piece for {unresolved} remaining factory line(s).
              </p>
            )}
            {over.length > 0 && (
              <p role="alert" className="text-sm text-red-700">
                Too many units assigned:{" "}
                {over
                  .map(
                    (piece) =>
                      `${piece.mark || "#" + piece.id} (${counts.get(piece.id)}/${piece.qty})`,
                  )
                  .join(", ")}
                .
              </p>
            )}
            {missing.length > 0 && (
              <div className="text-sm text-amber-800">
                <p className="font-medium">
                  Units still without a factory line:
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {missing.map((piece) => (
                    <li key={piece.id}>
                      {piece.mark || "#" + piece.id} · {piece.product}:{" "}
                      {piece.qty - (counts.get(piece.id) ?? 0)} remaining
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {needsReview && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={busy}
                  className="mt-1"
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                I reviewed the manual matches and any quantity differences.
              </label>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setAssignments({});
                }}
              >
                Cancel preview
              </Button>
              <Button
                onClick={confirm}
                disabled={
                  busy ||
                  unresolved > 0 ||
                  over.length > 0 ||
                  (needsReview && !reviewed)
                }
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm import
              </Button>
            </div>
          </section>
        </>
      )}
      {!preview && context.linkedUnits > 0 && (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Imported units</h2>
          <div className="mt-3 divide-y">
            {context.pieces
              .filter((piece) => piece.lineNumbers.length)
              .map((piece) => (
                <div key={piece.id} className="space-y-1 py-3 text-sm">
                  <p className="font-medium">{pieceLabel(piece)}</p>
                  <p className="break-words text-muted-foreground">
                    Line numbers: {piece.lineNumbers.join(", ")} ·{" "}
                    {piece.lineNumbers.length} / {piece.qty} units
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
