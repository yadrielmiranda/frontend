"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { normalizePieceMark, PIECE_MARK_MAX_LENGTH } from "./piece-mark";

interface InlinePieceMarkInputProps {
  value: string | null | undefined;
  fallback: string;
  onSave: (mark: string) => Promise<boolean>;
  className?: string;
}

export function InlinePieceMarkInput({
  value,
  fallback,
  onSave,
  className,
}: InlinePieceMarkInputProps) {
  const externalValue = String(value ?? "");
  const [draft, setDraft] = useState(externalValue);
  const [savedValue, setSavedValue] = useState(externalValue);
  const [isSaving, setIsSaving] = useState(false);
  const isFocusedRef = useRef(false);
  const isSavingRef = useRef(false);
  const skipNextBlurSaveRef = useRef(false);

  useEffect(() => {
    // No pisamos lo que el usuario está escribiendo si llega otra renderización.
    if (isFocusedRef.current || isSavingRef.current) return;

    setDraft(externalValue);
    setSavedValue(externalValue);
  }, [externalValue]);

  const saveDraft = async () => {
    if (isSavingRef.current) return;

    const normalizedMark = normalizePieceMark(draft);

    if (normalizedMark === normalizePieceMark(savedValue)) {
      setDraft(normalizedMark);
      setSavedValue(normalizedMark);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const wasSaved = await onSave(normalizedMark);

      if (wasSaved) {
        setDraft(normalizedMark);
        setSavedValue(normalizedMark);
      } else {
        setDraft(savedValue);
      }
    } catch {
      setDraft(savedValue);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <Input
        value={draft}
        maxLength={PIECE_MARK_MAX_LENGTH}
        disabled={isSaving}
        placeholder={fallback}
        aria-label="Piece mark"
        aria-busy={isSaving}
        title={`Edit mark (maximum ${PIECE_MARK_MAX_LENGTH} characters)`}
        className={cn(
          "h-9 min-w-0 bg-white pr-8 font-semibold",
          isSaving && "text-slate-500",
        )}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onChange={(event) => {
          setDraft(event.target.value.slice(0, PIECE_MARK_MAX_LENGTH));
        }}
        onBlur={() => {
          isFocusedRef.current = false;

          if (skipNextBlurSaveRef.current) {
            skipNextBlurSaveRef.current = false;
            return;
          }

          void saveDraft();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            skipNextBlurSaveRef.current = true;
            setDraft(savedValue);
            event.currentTarget.blur();
          }
        }}
      />

      {isSaving && (
        <Loader2
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600"
        />
      )}
    </div>
  );
}
