"use client";

import { Input } from "@/components/ui/input";
import { MaterialBarcodeCamera } from "./material-barcode-camera";

/** Capture only the identifier; creating or saving the presentation remains explicit. */
export function MaterialBarcodeInput({ value, onChange, disabled, label }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return <div className="space-y-2">
    <Input aria-label={label} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={120} value={value} disabled={disabled} onChange={event => { if (!disabled) onChange(event.target.value); }} onKeyDown={event => {
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); }
    }} />
    <MaterialBarcodeCamera disabled={disabled} onDetected={code => { if (!disabled) onChange(code); }} />
  </div>;
}
