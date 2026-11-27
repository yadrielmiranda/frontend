"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Paperclip, Trash2 } from "lucide-react";
import {
  deleteEstimateNoteAttachment, estimateNoteAttachmentUrl, getEstimateNoteAttachments,
  uploadEstimateNoteAttachment, type EstimateNoteAttachment, type EstimateNoteAttachmentsResponse,
} from "@/app/api/estimates.api";
import type { CompanyLocale } from "@/components/company/company-content";
import { Button } from "@/components/ui/button";

const MB = 1_000_000;
const GB = 1_000_000_000;
const PORTAL_LIMIT_GB = 10;
const PORTAL_LIMIT_BYTES = PORTAL_LIMIT_GB * GB;
const MAX_FILES = 5;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

const spanishAttachmentMessages = new Map([
  ["Could not load attachments.", "No se pudieron cargar los archivos adjuntos."],
  ["Could not update attachments.", "No se pudieron actualizar los archivos adjuntos."],
  ["You can attach up to 5 files per estimate. Select fewer files or remove an attachment.", "Puedes adjuntar hasta 5 archivos por cotización. Selecciona menos archivos o elimina uno de los adjuntos."],
  ["Choose a photo or PDF.", "Selecciona una foto o un PDF."],
  ["Choose a JPEG, PNG, WebP photo or PDF.", "Selecciona una imagen JPEG, PNG o WebP, o un PDF."],
  ["Each attachment must be 10 MB or smaller.", "Cada archivo debe tener un máximo de 10 MB."],
  ["Each file must be 10 MB or smaller.", "Cada archivo debe tener un máximo de 10 MB."],
  ["The processed photo exceeds 10 MB. Upload a smaller photo.", "La foto procesada supera los 10 MB. Sube una foto más pequeña."],
  ["Choose a valid, still photo of 50 megapixels or less.", "Selecciona una imagen fija válida de 50 megapíxeles o menos."],
  ["Attachment not found.", "No se encontró el archivo adjunto."],
  ["An estimate can have up to 5 attachments.", "Puedes adjuntar hasta 5 archivos por cotización."],
  ["These attachments would exceed the 25 MB limit for this estimate.", "Estos archivos superarían el límite de 25 MB de la cotización."],
  ["Attachment storage is full. Contact an administrator.", "El almacenamiento de archivos adjuntos está lleno. Contacta con un administrador."],
  ["The upload expired. Please try again.", "La carga caducó. Vuelve a intentarlo."],
  ["The saved attachment is unavailable.", "El archivo adjunto guardado no está disponible."],
  ["Estimate not found.", "No se encontró la cotización."],
  ["Failed to fetch", "No se pudo conectar con el servidor."],
]);
type AttachmentMessage = string | Record<CompanyLocale, string>;

function attachmentText(message: AttachmentMessage, locale: CompanyLocale) {
  if (typeof message !== "string") return message[locale];
  return locale === "es" ? spanishAttachmentMessages.get(message) ?? message : message;
}

function fileSize(bytes: number, locale: CompanyLocale) {
  if (bytes === 0) return "0 MB";
  return bytes < MB ? `${Math.ceil(bytes / 1000)} KB` : `${(bytes / MB).toLocaleString(locale === "es" ? "es-US" : "en-US", { maximumFractionDigits: 2 })} MB`;
}

function checkSelection(files: File[], saved: EstimateNoteAttachmentsResponse) {
  if (saved.attachments.length + files.length > MAX_FILES) return "You can attach up to 5 files per estimate. Select fewer files or remove an attachment.";
  for (const file of files) {
    if (file.size === 0) return { en: `${file.name} is empty.`, es: `El archivo ${file.name} está vacío.` };
    if (file.size > 10 * MB) return { en: `${file.name} exceeds the 10 MB limit per file.`, es: `${file.name} supera el límite de 10 MB por archivo.` };
    if (!/\.(jpe?g|png|webp|pdf)$/i.test(file.name) && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      return { en: `Choose a JPG, PNG, WebP or PDF file instead of ${file.name}.`, es: `El formato de ${file.name} no es compatible. Selecciona un archivo JPG, PNG, WebP o PDF.` };
    }
  }
  return "";
}

export function useEstimateNoteAttachments(estimateId: number, enabled: boolean, canEdit: boolean, locale: CompanyLocale = "en") {
  const [data, setData] = useState<EstimateNoteAttachmentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState<AttachmentMessage>("");
  const [progress, setProgress] = useState<AttachmentMessage>("");
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
        setProgress({ en: `Uploading ${index + 1} of ${files.length}: ${file.name}…`, es: `Subiendo ${index + 1} de ${files.length}: ${file.name}…` });
        const latest = await uploadEstimateNoteAttachment(estimateId, file);
        if (current !== generation.current) return;
        setData(latest);
      }
    });
  }

  async function remove(file: EstimateNoteAttachment) {
    await mutate(async current => {
      setProgress({ en: `Removing ${file.name}…`, es: `Eliminando ${file.name}…` });
      const latest = await deleteEstimateNoteAttachment(estimateId, file.id);
      if (current === generation.current) setData(latest);
    });
  }

  return { estimateId, canEdit, data, loading, locale, loadError: attachmentText(loadError, locale),
    actionError: attachmentText(actionError, locale), progress: attachmentText(progress, locale), refresh, upload, remove };
}

type FilesState = ReturnType<typeof useEstimateNoteAttachments>;

export function NoteAttachmentPicker({ files }: { files: FilesState }) {
  const input = useRef<HTMLInputElement>(null);
  const label = files.locale === "es" ? "Adjuntar archivos" : "Attach files";
  const disabled = !files.canEdit || !files.data || files.loading || Boolean(files.progress)
    || files.data.attachments.length >= MAX_FILES || files.data.usedBytes >= 25 * MB
    || (files.data.storage?.usedBytes ?? 0) >= PORTAL_LIMIT_BYTES;
  return <>
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
      <Paperclip aria-hidden="true" /> {label}
    </Button>
    <input ref={input} type="file" multiple accept={ACCEPT} disabled={disabled} hidden aria-label={label}
      onChange={event => {
        const selected = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        void files.upload(selected);
      }} />
  </>;
}

export function NoteAttachmentList({ files, isAdmin }: { files: FilesState; isAdmin: boolean }) {
  const { data, canEdit, progress, estimateId, locale } = files;
  const es = locale === "es";
  const downloadLabel = es ? "Descargar" : "Download";
  const removeLabel = es ? "Eliminar" : "Remove";
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const busy = Boolean(progress) || files.loading;
  return <div className="mt-4 space-y-2 border-t border-amber-200/80 pt-3">
    {files.loading && !data && <p role="status" className="text-sm text-slate-600">{es ? "Cargando archivos adjuntos…" : "Loading attachments…"}</p>}
    {files.loadError && <div className="flex flex-wrap items-center gap-2">
      <p role="alert" className="text-sm text-destructive">{files.loadError}</p>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void files.refresh()}>{es ? "Volver a cargar los archivos" : "Retry attachments"}</Button>
    </div>}
    {data && <>
      <p className="text-sm font-medium text-slate-700">{es ? "Archivos adjuntos" : "Attachments"} <span className="text-xs font-normal text-slate-600">({data.attachments.length}/5 · {fileSize(data.usedBytes, locale)} {es ? "de" : "of"} 25 MB)</span></p>
      {canEdit && <p className="text-xs text-slate-600">{es ? "JPG, PNG, WebP o PDF · Hasta 10 MB por archivo" : "JPG, PNG, WebP or PDF · Up to 10 MB per file"}</p>}
      {data.attachments.length > 0 && <ul className="divide-y divide-amber-200/70">
        {data.attachments.map(file => {
          const Icon = file.mimeType === "application/pdf" ? FileText : ImageIcon;
          return <li key={file.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
            <Icon aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
            <a href={estimateNoteAttachmentUrl(estimateId, file.id)} target="_blank" rel="noopener noreferrer"
              className="min-w-0 flex-1 break-all text-sm font-medium text-slate-800 underline underline-offset-2">{file.name}</a>
            <span className="text-xs text-slate-600">{fileSize(file.sizeBytes, locale)}</span>
            <Button asChild variant="ghost" size="icon" className="size-8">
              <a href={estimateNoteAttachmentUrl(estimateId, file.id, true)} aria-label={`${downloadLabel} ${file.name}`} title={downloadLabel}><Download aria-hidden="true" /></a>
            </Button>
            {canEdit && (confirmId === file.id ? <div className="flex basis-full flex-wrap items-center justify-end gap-2">
              <span className="text-sm">{es ? "¿Eliminar este archivo adjunto?" : "Remove this attachment?"}</span>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirmId(null)}>{es ? "Cancelar" : "Cancel"}</Button>
              <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => {
                setConfirmId(null);
                void files.remove(file);
              }}>{removeLabel}</Button>
            </div> : <Button type="button" variant="ghost" size="icon" className="size-8" disabled={busy}
              aria-label={`${removeLabel} ${file.name}`} title={removeLabel} onClick={() => setConfirmId(file.id)}><Trash2 aria-hidden="true" /></Button>)}
          </li>;
        })}
      </ul>}
      {isAdmin && data.storage && <p role={data.storage.warning ? "alert" : undefined}
        className={data.storage.warning ? "text-sm font-semibold text-amber-900" : "text-xs text-slate-600"}>
        {es ? "Almacenamiento de archivos adjuntos del portal" : "Portal attachment storage"}: {(data.storage.usedBytes / GB).toLocaleString(es ? "es-US" : "en-US", { maximumFractionDigits: 2 })} {es ? "de" : "of"} {PORTAL_LIMIT_GB} GB.
        {data.storage.warning && (data.storage.usedBytes >= PORTAL_LIMIT_BYTES
          ? (es ? " El almacenamiento está lleno. Elimina un archivo adjunto para subir otro." : " Storage is full. Remove an attachment to upload another file.")
          : (es ? ` Quedan ${fileSize(PORTAL_LIMIT_BYTES - data.storage.usedBytes, locale)} para nuevos archivos.` : ` Only ${fileSize(PORTAL_LIMIT_BYTES - data.storage.usedBytes, locale)} available for new attachments.`))}
      </p>}
    </>}
    {progress && <p role="status" className="break-all text-sm text-slate-700">{progress}</p>}
    {files.actionError && <p role="alert" className="break-words text-sm text-destructive">{files.actionError}</p>}
  </div>;
}
