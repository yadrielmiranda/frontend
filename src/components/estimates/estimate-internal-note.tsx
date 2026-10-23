"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/app/api/_base";
import {
  getEstimateInternalNote,
  updateEstimateInternalNote,
  type EstimateInternalNoteResponse,
} from "@/app/api/estimates.api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isAdminRole, isDealerRole, isOperatorRole } from "@/lib/rbac";

const MAX_NOTE_LENGTH = 2000;

export function EstimateInternalNote({
  estimateId,
  userRole,
}: {
  estimateId: number;
  userRole?: string | null;
}) {
  if (!isAdminRole(userRole) && !isDealerRole(userRole) && !isOperatorRole(userRole)) return null;

  return <InternalNoteEditor key={`${estimateId}:${userRole}`} estimateId={estimateId}
    allowEditing={isAdminRole(userRole) || isDealerRole(userRole)} />;
}

function InternalNoteEditor({ estimateId, allowEditing }: { estimateId: number; allowEditing: boolean }) {
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
    <section className="min-w-0 rounded-lg border border-slate-300 bg-amber-50 p-4 shadow-sm sm:p-6 print:hidden"
      aria-labelledby={`internal-note-heading-${estimateId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`internal-note-heading-${estimateId}`} className="border-l-4 border-red-600 pl-3 text-xl font-semibold text-[#5C4033]">Internal note</h3>
        {canEdit && !editing && !loading && !loadError && (
          <Button type="button" variant="outline" size="sm" onClick={() => {
            setDraft(note?.text ?? "");
            setSaveError("");
            setConflict(false);
            setEditing(true);
          }}>{hasNote ? "Edit" : "Add note"}</Button>
        )}
      </div>

      {loading && <p role="status" className="mt-4 text-sm text-slate-500">Loading note…</p>}
      {loadError && <div className="mt-4 flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" size="sm" disabled={loading || saving}
          onClick={() => void load(editing)}>Retry</Button>
      </div>}

      {editing && canEdit ? (
        <div className="mt-4 space-y-3">
          <Textarea aria-label="Internal note" rows={4} maxLength={MAX_NOTE_LENGTH} value={draft}
            disabled={saving} onChange={event => setDraft(event.target.value)}
            className="border-slate-400 text-base font-medium leading-relaxed text-[#5C4033] shadow-none md:text-base" />
          <div className="text-right text-xs text-slate-500">{draft.length} / {MAX_NOTE_LENGTH}</div>
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          {conflict && !loading && !loadError && <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-medium">Latest saved note</p>
            <p className="whitespace-pre-wrap break-words text-base font-medium leading-relaxed text-[#5C4033]">{note?.text || "No note added."}</p>
          </div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => {
              setDraft(note?.text ?? "");
              setEditing(false);
              setConflict(false);
              setSaveError("");
            }}>Cancel</Button>
            <Button type="button" disabled={saving || loading || Boolean(loadError) || !dirty || draft.length > MAX_NOTE_LENGTH}
              onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      ) : data && !loading && !loadError ? (
        <p className={`mt-4 whitespace-pre-wrap break-words ${hasNote ? "text-base font-medium leading-relaxed text-[#5C4033]" : "text-sm text-slate-500"}`}>
          {note?.text || "No note added."}
        </p>
      ) : null}

      {note && !loading && !loadError && <p className="mt-3 text-xs text-slate-500">
        Last edited by {note.updatedBy.name} · {new Date(note.updatedAt).toLocaleString()}
      </p>}
    </section>
  );
}
