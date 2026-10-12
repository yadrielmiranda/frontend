"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isApiError } from "@/app/api/_base";
import { confirmExternalPo, previewExternalPo, type ExternalPoPreview } from "@/app/api/external-po.api";
import { externalPoReviewState } from "./preview-state";

const PAGE_SIZE = 50;

export function ExternalPoClient() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const saveLock = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExternalPoPreview | null>(null);
  const [parts, setParts] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ message: string; poNumber: string } | null>(null);
  const [page, setPage] = useState(0);
  const { invalid, needsReview, totalParts } = externalPoReviewState(preview?.lines ?? [], parts);
  const pages = Math.max(1, Math.ceil((preview?.lines.length ?? 0) / PAGE_SIZE));

  function clearPreview() {
    setPreview(null); setParts({}); setReviewed(false); setPage(0);
  }
  async function loadPreview() {
    if (!file || saveLock.current) return;
    saveLock.current = true; setBusy(true); setError(""); setSuccess(null); clearPreview();
    try {
      const next = await previewExternalPo(file);
      setPreview(next);
      setParts(Object.fromEntries(next.lines.map(line => [line.lineNumber, line.expectedParts === null ? "" : String(line.expectedParts)])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to preview this file.");
    } finally { saveLock.current = false; setBusy(false); }
  }
  async function confirm() {
    if (!file || !preview || !preview.lines.length || invalid || (needsReview && !reviewed) || saveLock.current) return;
    saveLock.current = true; setBusy(true); setError("");
    try {
      const result = await confirmExternalPo(file, preview.revision,
        preview.lines.map(line => ({ lineNumber: line.lineNumber, expectedParts: Number(parts[line.lineNumber]) })), reviewed);
      setSuccess({ poNumber: preview.document.poNumber, message: result.unchanged
        ? "This PO is already imported. No changes were needed."
        : `External PO imported. ${result.addedUnits} new units registered; ${result.linkedUnits} units linked.` });
      clearPreview(); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import this file.");
      if (isApiError(e) && e.status === 409) clearPreview();
    } finally { saveLock.current = false; setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Import External PO</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Register factory units for a PO without an order in this system. Receive the physical parts into a store when they arrive.</p></div>
      <Button asChild variant="outline"><Link href="/warehouse">Back to Inventory</Link></Button>
    </div>
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold"><FileJson className="h-5 w-5" />Factory JSON</h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2"><Label htmlFor="external-po-json">ECO purchase-order export</Label>
          <Input ref={fileInput} id="external-po-json" type="file" accept=".json,application/json" disabled={busy} onChange={event => {
            clearPreview(); setError(""); setSuccess(null);
            const next = event.target.files?.[0] ?? null;
            if (next && next.size > 5 * 1024 * 1024) { setFile(null); setError("Choose a JSON file of 5 MB or smaller."); return; }
            setFile(next);
          }} /><p className="text-xs text-muted-foreground">Up to 5 MB and 5,000 units.</p></div>
        <Button onClick={loadPreview} disabled={!file || busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Preview import</Button>
      </div>
    </section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {success && <section role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0" />{success.message}</p>
      <p>Registered units are ready for collection or receipt. Existing stock quantities are preserved.</p>
      <Button asChild variant="outline"><Link href={`/warehouse?view=all&source=EXTERNAL&search=${encodeURIComponent(success.poNumber)}`}>View PO in inventory</Link></Button>
    </section>}
    {preview && <>
      <section className="grid gap-4 rounded-xl border bg-white p-5 text-sm sm:grid-cols-4">
        <div className="min-w-0"><p className="text-muted-foreground">Factory PO</p><p className="mt-1 break-words font-semibold">{preview.document.poNumber}</p></div>
        <div className="min-w-0"><p className="text-muted-foreground">Name</p><p className="mt-1 break-words font-semibold">{preview.document.orderName || "—"}</p></div>
        <div className="min-w-0"><p className="text-muted-foreground">Supplier</p><p className="mt-1 break-words font-semibold">{preview.document.supplierName || "—"}</p></div>
        <div><p className="text-muted-foreground">Units in file</p><p className="mt-1 font-semibold">{preview.lines.length} · {preview.lines.filter(line => line.existing).length} already registered</p></div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="space-y-2 border-b p-5"><h3 className="font-semibold">Review physical parts</h3>
          <p className="text-sm text-muted-foreground">Enter the total number of physical parts sharing each barcode. Review the suggested count before importing.</p></div>
        <div className="divide-y">{preview.lines.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(line => <article key={line.lineNumber} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2"><p className="break-words text-sm font-semibold">Line {line.lineNumber} · {line.mark || "No mark"}{line.existing && <span className="ml-2 text-xs font-normal text-muted-foreground">Already registered</span>}</p>
            <p className="break-words text-sm">{line.description.split(/\r?\n/)[0] || "No description"}</p>
            <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Full description</summary><p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{line.description || "No description provided."}</p></details>
            {line.issues.length > 0 && <ul className="list-inside list-disc text-sm text-amber-800">{line.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
            {line.locked && <p className="text-xs text-muted-foreground">This unit has stock activity. Its saved part count is kept.</p>}
          </div>
          <div className="w-full space-y-2 sm:w-40 sm:shrink-0"><Label htmlFor={`parts-${line.lineNumber}`}>Expected parts</Label>
            <Input id={`parts-${line.lineNumber}`} type="number" inputMode="numeric" min={1} max={200} step={1} value={parts[line.lineNumber] ?? ""} disabled={busy || line.locked} placeholder="Enter count" onChange={event => {
              setParts(current => ({ ...current, [line.lineNumber]: event.target.value })); setReviewed(false);
            }} /></div>
        </article>)}</div>
        {pages > 1 && <div className="flex items-center justify-between gap-3 border-t p-4 text-sm"><span>Page {page + 1} of {pages}</span><div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={busy || page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Next</Button>
        </div></div>}
      </section>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <p className="text-sm">{preview.lines.length} units · {totalParts} expected physical parts</p>
        {invalid > 0 && <p className="text-sm text-amber-800">Enter a whole count from 1 to 200 for {invalid} remaining unit(s).</p>}
        {needsReview && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />I reviewed the descriptions and confirmed the physical part counts, including any changes.</label>}
        <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={clearPreview}>Cancel preview</Button>
          <Button disabled={busy || !preview.lines.length || invalid > 0 || (needsReview && !reviewed)} onClick={confirm}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm import</Button></div>
      </section>
    </>}
  </div>;
}
