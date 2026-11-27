"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/app/api/_base";
import {
  getEstimateInternalNote,
  updateEstimateInternalNote,
  type EstimateInternalNoteResponse,
} from "@/app/api/estimates.api";
import { Button } from "@/components/ui/button";
import type { CompanyLocale } from "@/components/company/company-content";
import { Textarea } from "@/components/ui/textarea";
import { isAdminRole, isDealerRole, isOperatorRole } from "@/lib/rbac";
import { NoteAttachmentList, NoteAttachmentPicker, useEstimateNoteAttachments } from "./estimate-note-attachments";

const MAX_NOTE_LENGTH = 2000;
const spanishNoteMessages = new Map([
  ["Could not load the internal note.", "No se pudo cargar la nota interna."],
  ["Could not save the internal note.", "No se pudo guardar la nota interna."],
  ["Someone updated this note. Your draft is unchanged. Review the latest saved note before saving again.", "Otra persona actualizó la nota. Tu borrador sigue disponible. Revisa la última versión guardada antes de guardar tus cambios."],
  ["You cannot edit internal estimate notes.", "No tienes permiso para editar las notas internas de la cotización."],
  ["You cannot view internal estimate notes.", "No tienes permiso para ver las notas internas de la cotización."],
  ["Estimate not found.", "No se encontró la cotización."],
  ["Failed to fetch", "No se pudo conectar con el servidor."],
]);

export function EstimateInternalNote({
  estimateId,
  userRole,
  locale = "en",
}: {
  estimateId: number;
  userRole?: string | null;
  locale?: CompanyLocale;
}) {
  if (!isAdminRole(userRole) && !isDealerRole(userRole) && !isOperatorRole(userRole)) return null;

  return <InternalNoteEditor locale={locale} key={`${estimateId}:${userRole}`} estimateId={estimateId}
    allowEditing={isAdminRole(userRole) || isDealerRole(userRole)} isAdmin={isAdminRole(userRole)} />;
}

function InternalNoteEditor({ estimateId, allowEditing, isAdmin, locale }: { estimateId: number; allowEditing: boolean; isAdmin: boolean; locale: CompanyLocale }) {
  const es = locale === "es";
  const title = es ? "Nota interna" : "Internal note";
  const empty = es ? "Todavía no hay una nota." : "No note added.";
  const errorText = (message: string) => es ? spanishNoteMessages.get(message) ?? message : message;
  const [data, setData] = useState<EstimateInternalNoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const requestGeneration = useRef(0);
  const saveInFlight = useRef(false);

  const load = useCallback(async (preserveDraft = false) => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError("");
    try {
      const latest = await getEstimateInternalNote(estimateId);
      if (generation !== requestGeneration.current) return;
      setData(latest);
      if (!preserveDraft) {
        setDraft(latest.internalNote?.text ?? "");
        setEditing(false);
        setConflict(false);
        setSaveError("");
      }
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      setLoadError(error instanceof Error ? error.message : "Could not load the internal note.");
      if (isApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404)) {
        setData(null);
        setDraft("");
        setEditing(false);
      }
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => {
    void load();
    return () => { requestGeneration.current += 1; };
  }, [load]);

  const canEdit = allowEditing && data?.canEdit === true;
  const attachments = useEstimateNoteAttachments(estimateId, Boolean(data) && !loadError, canEdit, locale);
  const note = data?.internalNote;
  const hasNote = Boolean(note?.text);
  const dirty = draft !== (note?.text ?? "");

  async function save() {
    if (!canEdit || !data || loading || loadError || saveInFlight.current || !dirty || draft.length > MAX_NOTE_LENGTH) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaveError("");
    const generation = requestGeneration.current;
    try {
      const updated = await updateEstimateInternalNote(estimateId, {
        text: draft,
        expectedVersion: note?.version ?? 0,
      });
      if (generation !== requestGeneration.current) return;
      setData(updated);
      setDraft(updated.internalNote?.text ?? "");
      setEditing(false);
      setConflict(false);
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      if (isApiError(error) && error.status === 409) {
        setConflict(true);
        setSaveError("Someone updated this note. Your draft is unchanged. Review the latest saved note before saving again.");
        await load(true);
      } else if (isApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404)) {
        setData(null);
        setDraft("");
        setEditing(false);
        setLoadError(error.message);
      } else {
        setSaveError(error instanceof Error ? error.message : "Could not save the internal note.");
      }
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <section lang={locale} className="min-w-0 rounded-lg border border-slate-300 bg-amber-50 p-4 shadow-sm sm:p-6 print:hidden"
      aria-labelledby={`internal-note-heading-${estimateId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`internal-note-heading-${estimateId}`} className="border-l-4 border-red-600 pl-3 text-xl font-semibold text-[#5C4033]">{title}</h3>
        {canEdit && !loading && !loadError && <div className="flex flex-wrap gap-2">
          {!editing && <Button type="button" variant="outline" size="sm" onClick={() => {
              setDraft(note?.text ?? "");
              setSaveError("");
              setConflict(false);
              setEditing(true);
            }}>{hasNote ? (es ? "Editar" : "Edit") : (es ? "Agregar nota" : "Add note")}</Button>}
          <NoteAttachmentPicker files={attachments} />
        </div>}
      </div>

      {loading && <p role="status" className="mt-4 text-sm text-slate-500">{es ? "Cargando nota…" : "Loading note…"}</p>}
      {loadError && <div className="mt-4 flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-destructive">{errorText(loadError)}</p>
        <Button type="button" variant="outline" size="sm" disabled={loading || saving}
          onClick={() => void load(editing)}>{es ? "Reintentar" : "Retry"}</Button>
      </div>}

      {editing && canEdit ? (
        <div className="mt-4 space-y-3">
          <Textarea aria-label={title} rows={4} maxLength={MAX_NOTE_LENGTH} value={draft}
            disabled={saving} onChange={event => setDraft(event.target.value)}
            className="border-slate-400 text-base font-medium leading-relaxed text-[#5C4033] shadow-none md:text-base" />
          <div className="text-right text-xs text-slate-500">{draft.length} / {MAX_NOTE_LENGTH}</div>
          {saveError && <p role="alert" className="text-sm text-destructive">{errorText(saveError)}</p>}
          {conflict && !loading && !loadError && <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-medium">{es ? "Última nota guardada" : "Latest saved note"}</p>
            <p className="whitespace-pre-wrap break-words text-base font-medium leading-relaxed text-[#5C4033]">{note?.text || empty}</p>
          </div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => {
              setDraft(note?.text ?? "");
              setEditing(false);
              setConflict(false);
              setSaveError("");
            }}>{es ? "Cancelar" : "Cancel"}</Button>
            <Button type="button" disabled={saving || loading || Boolean(loadError) || !dirty || draft.length > MAX_NOTE_LENGTH}
              onClick={() => void save()}>{saving ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar" : "Save")}</Button>
          </div>
        </div>
      ) : data && !loading && !loadError ? (
        <p className={`mt-4 whitespace-pre-wrap break-words ${hasNote ? "text-base font-medium leading-relaxed text-[#5C4033]" : "text-sm text-slate-500"}`}>
          {note?.text || empty}
        </p>
      ) : null}

      {note && !loading && !loadError && <p className="mt-3 text-xs text-slate-500">
        {es ? "Última edición de" : "Last edited by"} {note.updatedBy.name} · {new Date(note.updatedAt).toLocaleString(es ? "es-US" : "en-US")}
      </p>}
      {data && !loadError && <NoteAttachmentList files={attachments} isAdmin={isAdmin} />}
    </section>
  );
}
