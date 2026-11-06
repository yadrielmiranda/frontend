"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Paperclip, Trash2 } from "lucide-react";
import {
  deleteEstimateNoteAttachment, estimateNoteAttachmentUrl, getEstimateNoteAttachments,
  uploadEstimateNoteAttachment, type EstimateNoteAttachment, type EstimateNoteAttachmentsResponse,
} from "@/app/api/estimates.api";
import { Button } from "@/components/ui/button";

const MB = 1_000_000;
const GB = 1_000_000_000;
const PORTAL_LIMIT_GB = 10;
const PORTAL_LIMIT_BYTES = PORTAL_LIMIT_GB * GB;
const MAX_FILES = 5;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

function fileSize(bytes: number) {
  if (bytes === 0) return "0 MB";
  return bytes < MB ? `${Math.ceil(bytes / 1000)} KB` : `${(bytes / MB).toLocaleString("en-US", { maximumFractionDigits: 2 })} MB`;
}

function checkSelection(files: File[], saved: EstimateNoteAttachmentsResponse) {
  if (saved.attachments.length + files.length > MAX_FILES) return "You can attach up to 5 files per estimate. Select fewer files or remove an attachment.";
  for (const file of files) {
    if (file.size === 0) return `${file.name} is empty.`;
    if (file.size > 10 * MB) return `${file.name} exceeds the 10 MB limit per file.`;
    if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name) && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      return `Choose a JPG, PNG, WebP or PDF file instead of ${file.name}.`;
    }
  }
  return "";
}

export function useEstimateNoteAttachments(estimateId: number, enabled: boolean, canEdit: boolean) {
  const [data, setData] = useState<EstimateNoteAttachmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [progress, setProgress] = useState("");
  const generation = useRef(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    const current = generation.current;
    setLoading(true);
    setLoadError("");
    try {
      const latest = await getEstimateNoteAttachments(estimateId);
      if (generation.current === current) setData(latest);
    } catch (error) {
      if (generation.current === current) {
        setData(null);
        setLoadError(error instanceof Error ? error.message : "Could not load attachments.");
      }
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    setData(null);
    setActionError("");
    setProgress("");
    inFlight.current = false;
    if (enabled) void refresh();
    return () => { generation.current += 1; };
  }, [enabled, refresh]);

  async function mutate(work: (current: number) => Promise<void>) {
    if (!enabled || !canEdit || !data || loading || inFlight.current) return;
    const current = generation.current;
    inFlight.current = true;
    setActionError("");
    try {
      await work(current);
    } catch (error) {
      if (current === generation.current) {
        setActionError(error instanceof Error ? error.message : "Could not update attachments.");
        await refresh(); // A different user may have changed the list or filled the quota.
      }
    } finally {
      if (current === generation.current) {
        setProgress("");
        inFlight.current = false;
      }
    }
  }

  async function upload(files: File[]) {
    if (!data || !files.length) return;
    const problem = checkSelection(files, data);
    if (problem) { setActionError(problem); return; }
    await mutate(async current => {
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading ${index + 1} of ${files.length}: ${file.name}…`);
        const latest = await uploadEstimateNoteAttachment(estimateId, file);
        if (current !== generation.current) return;
        setData(latest);
      }
    });
  }

  async function remove(file: EstimateNoteAttachment) {
    await mutate(async current => {
      setProgress(`Removing ${file.name}…`);
      const latest = await deleteEstimateNoteAttachment(estimateId, file.id);
      if (current === generation.current) setData(latest);
    });
  }

  return { estimateId, canEdit, data, loading, loadError, actionError, progress, refresh, upload, remove };
}

type FilesState = ReturnType<typeof useEstimateNoteAttachments>;

export function NoteAttachmentPicker({ files }: { files: FilesState }) {
  const input = useRef<HTMLInputElement>(null);
  const disabled = !files.canEdit || !files.data || files.loading || Boolean(files.progress)
    || files.data.attachments.length >= MAX_FILES || files.data.usedBytes >= 25 * MB
    || (files.data.storage?.usedBytes ?? 0) >= PORTAL_LIMIT_BYTES;
  return <>
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
      <Paperclip aria-hidden="true" /> Attach files
    </Button>
    <input ref={input} type="file" multiple accept={ACCEPT} disabled={disabled} hidden aria-label="Attach files"
      onChange={event => {
        const selected = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        void files.upload(selected);
      }} />
  </>;
}

export function NoteAttachmentList({ files, isAdmin }: { files: FilesState; isAdmin: boolean }) {
  const { data, canEdit, progress, estimateId } = files;
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const busy = Boolean(progress) || files.loading;
  return <div className="mt-4 space-y-2 border-t border-amber-200/80 pt-3">
    {files.loading && !data && <p role="status" className="text-sm text-slate-600">Loading attachments…</p>}
    {files.loadError && <div className="flex flex-wrap items-center gap-2">
      <p role="alert" className="text-sm text-destructive">{files.loadError}</p>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void files.refresh()}>Retry attachments</Button>
    </div>}
    {data && <>
      <p className="text-sm font-medium text-slate-700">Attachments <span className="text-xs font-normal text-slate-600">({data.attachments.length}/5 · {fileSize(data.usedBytes)} of 25 MB)</span></p>
      {canEdit && <p className="text-xs text-slate-600">JPG, PNG, WebP or PDF · Up to 10 MB per file</p>}
      {data.attachments.length > 0 && <ul className="divide-y divide-amber-200/70">
        {data.attachments.map(file => {
          const Icon = file.mimeType === "application/pdf" ? FileText : ImageIcon;
          return <li key={file.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
            <Icon aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
            <a href={estimateNoteAttachmentUrl(estimateId, file.id)} target="_blank" rel="noopener noreferrer"
              className="min-w-0 flex-1 break-all text-sm font-medium text-slate-800 underline underline-offset-2">{file.name}</a>
            <span className="text-xs text-slate-600">{fileSize(file.sizeBytes)}</span>
            <Button asChild variant="ghost" size="icon" className="size-8">
              <a href={estimateNoteAttachmentUrl(estimateId, file.id, true)} aria-label={`Download ${file.name}`} title="Download"><Download aria-hidden="true" /></a>
            </Button>
            {canEdit && (confirmId === file.id ? <div className="flex basis-full flex-wrap items-center justify-end gap-2">
              <span className="text-sm">Remove this attachment?</span>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => {
                setConfirmId(null);
                void files.remove(file);
              }}>Remove</Button>
            </div> : <Button type="button" variant="ghost" size="icon" className="size-8" disabled={busy}
              aria-label={`Remove ${file.name}`} title="Remove" onClick={() => setConfirmId(file.id)}><Trash2 aria-hidden="true" /></Button>)}
          </li>;
        })}
      </ul>}
      {isAdmin && data.storage && <p role={data.storage.warning ? "alert" : undefined}
        className={data.storage.warning ? "text-sm font-semibold text-amber-900" : "text-xs text-slate-600"}>
        Portal attachment storage: {(data.storage.usedBytes / GB).toLocaleString("en-US", { maximumFractionDigits: 2 })} of {PORTAL_LIMIT_GB} GB.
        {data.storage.warning && (data.storage.usedBytes >= PORTAL_LIMIT_BYTES
          ? " Storage is full. Remove an attachment to upload another file."
          : ` Only ${fileSize(PORTAL_LIMIT_BYTES - data.storage.usedBytes)} available for new attachments.`)}
      </p>}
    </>}
    {progress && <p role="status" className="break-all text-sm text-slate-700">{progress}</p>}
    {files.actionError && <p role="alert" className="break-words text-sm text-destructive">{files.actionError}</p>}
  </div>;
}
