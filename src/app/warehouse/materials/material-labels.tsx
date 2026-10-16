"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Check, Eye, FileText, Printer, Ruler, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { MaterialPresentation, MaterialProduct } from "@/app/api/materials.api";
import {
  buildLabelPrintHtml, buildMaterialLabelMarkup, DEFAULT_LABEL_PRINT_SETTINGS,
  getLabelLayout, LABEL_PRINT_STORAGE_KEY, MATERIAL_LABEL_CSS,
  normalizeStoredLabelSettings, type LabelPrintContent, type LabelPrintSettings,
} from "@/lib/material-label-print";
import { MaterialField, MaterialNotice } from "./materials-shared";

const SIZE_PRESETS = [
  { value: "50x30", label: "50 × 30 mm", width: 50, height: 30 },
  { value: "70x40", label: "70 × 40 mm", width: 70, height: 40 },
  { value: "100x50", label: "100 × 50 mm", width: 100, height: 50 },
  { value: "100x150", label: "100 × 150 mm", width: 100, height: 150 },
];
const numberValue = (value: string) => value.trim() === "" ? NaN : Number(value);

export function MaterialLabels({ product, presentation, onClose }: {
  product: MaterialProduct;
  presentation: MaterialPresentation;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<LabelPrintSettings["mode"]>(DEFAULT_LABEL_PRINT_SETTINGS.mode);
  const [paper, setPaper] = useState<LabelPrintSettings["paper"]>(DEFAULT_LABEL_PRINT_SETTINGS.paper);
  const [width, setWidth] = useState(String(DEFAULT_LABEL_PRINT_SETTINGS.widthMm));
  const [height, setHeight] = useState(String(DEFAULT_LABEL_PRINT_SETTINGS.heightMm));
  const [margin, setMargin] = useState(String(DEFAULT_LABEL_PRINT_SETTINGS.marginMm));
  const [gap, setGap] = useState(String(DEFAULT_LABEL_PRINT_SETTINGS.gapMm));
  const [copies, setCopies] = useState("1");
  const [customSize, setCustomSize] = useState(false);
  const [restored, setRestored] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [error, setError] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeImage, setBarcodeImage] = useState<{ code: string; svg: string; pixelWidth: number } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const previewContainer = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(320);

  useEffect(() => {
    let stored: unknown;
    try {
      const saved = window.localStorage.getItem(LABEL_PRINT_STORAGE_KEY);
      stored = saved ? JSON.parse(saved) : undefined;
    } catch {
      // Printing remains available when browser storage is unavailable.
    }
    const settings = normalizeStoredLabelSettings(stored);
    setMode(settings.mode);
    setPaper(settings.paper);
    setWidth(String(settings.widthMm));
    setHeight(String(settings.heightMm));
    setMargin(String(settings.marginMm));
    setGap(String(settings.gapMm));
    setRestored(true);
  }, []);

  useEffect(() => {
    setBarcodeImage(null);
    setBarcodeError("");
    setError("");
    if (!presentation.barcode) {
      setBarcodeError("This presentation needs a barcode before you can print labels.");
      return;
    }
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, presentation.barcode, {
        format: "CODE128", width: 1, height: 60, margin: 10,
        marginTop: 0, marginBottom: 0, displayValue: false,
      });
      svg.setAttribute("preserveAspectRatio", "none");
      const pixelWidth = Number.parseFloat(svg.getAttribute("width") ?? "");
      if (!Number.isFinite(pixelWidth) || pixelWidth <= 0) throw new Error("Invalid barcode size");
      setBarcodeImage({ code: presentation.barcode, svg: new XMLSerializer().serializeToString(svg), pixelWidth });
    } catch {
      setBarcodeError("This code cannot be printed as Code 128. Use a supported barcode for this presentation.");
    }
  }, [presentation.barcode]);

  useEffect(() => {
    const container = previewContainer.current;
    if (!container) return;
    const updateWidth = () => setPreviewWidth(Math.max(120, container.clientWidth - 48));
    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const settings: LabelPrintSettings = {
    mode, paper, widthMm: numberValue(width), heightMm: numberValue(height),
    copies: numberValue(copies), marginMm: numberValue(margin), gapMm: numberValue(gap),
  };
  const layout = getLabelLayout(settings);
  const currentBarcode = barcodeImage?.code === presentation.barcode ? barcodeImage : null;
  const moduleWidth = currentBarcode ? (settings.widthMm - 4) / currentBarcode.pixelWidth : 0;
  const minimumBarcodeWidth = currentBarcode ? Math.ceil(currentBarcode.pixelWidth * 0.19 + 4) : 0;
  const recommendedBarcodeWidth = currentBarcode ? Math.ceil(currentBarcode.pixelWidth * 0.25 + 4) : 0;
  const barcodeSizeError = currentBarcode && Number.isFinite(settings.widthMm) && moduleWidth < 0.19
    ? `This barcode needs a label at least ${minimumBarcodeWidth} mm wide to remain readable.` : "";
  const validationError = barcodeError || layout.error || barcodeSizeError;
  const canPrint = restored && Boolean(currentBarcode) && !validationError && !preparing;
  const selectedPreset = (!customSize && SIZE_PRESETS.find(item => item.width === settings.widthMm && item.height === settings.heightMm)?.value) || "custom";

  useEffect(() => {
    if (!restored || layout.error) return;
    try {
      window.localStorage.setItem(LABEL_PRINT_STORAGE_KEY, JSON.stringify({
        mode, paper, widthMm: numberValue(width), heightMm: numberValue(height),
        marginMm: numberValue(margin), gapMm: numberValue(gap),
      }));
      setPreferencesSaved(true);
    } catch {
      // Preference saving is optional; it must never prevent printing.
      setPreferencesSaved(false);
    }
  }, [restored, layout.error, mode, paper, width, height, margin, gap]);

  const content: LabelPrintContent = {
    productName: product.name, presentationName: presentation.name,
    quantityText: `${presentation.multiplier} ${product.baseUnit.name}`,
    productCode: product.code, barcode: presentation.barcode ?? "", barcodeSvg: currentBarcode?.svg ?? "",
  };
  const labelMarkup = currentBarcode && !layout.error && !barcodeSizeError
    ? buildMaterialLabelMarkup(content, settings) : "";
  const labelWidthPx = settings.widthMm * 96 / 25.4;
  const labelHeightPx = settings.heightMm * 96 / 25.4;
  const previewScale = Math.min(1, previewWidth / labelWidthPx, 260 / labelHeightPx);

  function openPrintDocument(autoPrint: boolean) {
    if (!canPrint) return;
    setError("");
    const popup = window.open("", "_blank", "width=1050,height=800");
    if (!popup) {
      setError("Allow pop-ups for this site, then try again to open your labels.");
      return;
    }
    setPreparing(true);
    try {
      popup.opener = null;
      popup.document.open();
      popup.document.write(buildLabelPrintHtml(content, settings));
      popup.document.close();
      const button = popup.document.querySelector<HTMLButtonElement>("[data-print-action]");
      if (button) {
        button.disabled = true;
        button.textContent = "Preparing labels…";
      }
      const ready = Promise.all([
        ...Array.from(popup.document.images, image => image.decode()),
        popup.document.fonts.ready,
      ]);
      let closeCheck: number | undefined;
      const closed = new Promise<void>(resolve => {
        closeCheck = window.setInterval(() => {
          if (popup.closed) resolve();
        }, 250);
      });
      const print = () => {
        if (popup.closed) return;
        popup.focus();
        popup.requestAnimationFrame(() => { if (!popup.closed) popup.print(); });
      };
      void Promise.race([ready, closed]).then(() => {
        if (popup.closed) return;
        if (button) {
          button.disabled = false;
          button.textContent = "Print labels";
          button.addEventListener("click", print);
        }
        if (autoPrint) print();
      }).catch(() => {
        setError("The labels could not finish loading. Close the print window and try again.");
        if (button) button.textContent = "Unable to load labels";
      }).finally(() => {
        window.clearInterval(closeCheck);
        setPreparing(false);
      });
    } catch {
      setPreparing(false);
      setError("Unable to open the print preview. Please close the print window and try again.");
    }
  }

  return (
    <Dialog open onOpenChange={value => { if (!value) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[940px]">
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left sm:px-7">
          <div className="flex items-center gap-3.5 pr-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Printer className="size-5" aria-hidden="true" /></div>
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="text-xl font-semibold tracking-tight">Print material labels</DialogTitle>
              <DialogDescription>Set the size and layout before printing.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          <div className="grid md:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6 px-6 py-6 sm:px-7 md:border-r">
              <fieldset>
                <legend className="mb-2.5 text-sm font-semibold text-slate-900">Print format</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { value: "sheet", title: "Normal sheet", subtitle: "Multiple labels per page", Icon: FileText },
                    { value: "thermal", title: "Label printer", subtitle: "One label per page", Icon: Printer },
                  ] as const).map(({ value, title, subtitle, Icon }) => (
                    <label key={value} className="relative cursor-pointer">
                      <input className="peer sr-only" type="radio" name="material-label-format" value={value} checked={mode === value} onChange={() => { setMode(value); setError(""); }} />
                      <span className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors peer-checked:border-slate-900 peer-checked:bg-slate-50 peer-checked:shadow-[inset_0_0_0_1px_#0f172a] peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2">
                        <span className="flex items-center justify-between"><Icon className="size-5 text-slate-600" aria-hidden="true" />{mode === value && <Check className="size-4 text-slate-900" aria-hidden="true" />}</span>
                        <span className="space-y-1"><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="block text-xs leading-relaxed text-slate-500">{subtitle}</span></span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {mode === "sheet" && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Paper size</legend>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                    {([{ value: "letter", label: "Letter", size: "8.5 × 11 in" }, { value: "a4", label: "A4", size: "210 × 297 mm" }] as const).map(item => (
                      <label key={item.value} className="cursor-pointer">
                        <input className="peer sr-only" type="radio" name="material-label-paper" value={item.value} checked={paper === item.value} onChange={() => setPaper(item.value)} />
                        <span className="block rounded-md px-2 py-2 text-center text-sm text-slate-500 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"><span className="font-semibold">{item.label}</span><span className="mt-0.5 block text-[11px]">{item.size}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="space-y-3">
                <MaterialField label="Label size">
                  <select className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={selectedPreset} onChange={event => {
                    const preset = SIZE_PRESETS.find(item => item.value === event.target.value);
                    setCustomSize(!preset);
                    if (preset) { setWidth(String(preset.width)); setHeight(String(preset.height)); }
                  }}>
                    {SIZE_PRESETS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                    <option value="custom">Custom size</option>
                  </select>
                </MaterialField>
                <div className="grid grid-cols-2 gap-3">
                  <MaterialField label="Width (mm)"><Input className="h-10 rounded-lg" type="number" min={30} max={200} step="0.1" inputMode="decimal" value={width} onChange={event => { setWidth(event.target.value); setCustomSize(true); }} /></MaterialField>
                  <MaterialField label="Height (mm)"><Input className="h-10 rounded-lg" type="number" min={20} max={200} step="0.1" inputMode="decimal" value={height} onChange={event => { setHeight(event.target.value); setCustomSize(true); }} /></MaterialField>
                </div>
              </div>

              <MaterialField label="Number of labels" hint="All copies use this presentation’s barcode."><Input className="h-10 rounded-lg" type="number" min={1} max={200} step={1} inputMode="numeric" value={copies} onChange={event => setCopies(event.target.value)} /></MaterialField>

              {mode === "sheet" && (
                <details className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Sheet spacing</summary>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MaterialField label="Margins (mm)"><Input type="number" min={0} max={25} step="0.1" value={margin} onChange={event => setMargin(event.target.value)} /></MaterialField>
                    <MaterialField label="Gap (mm)"><Input type="number" min={0} max={10} step="0.1" value={gap} onChange={event => setGap(event.target.value)} /></MaterialField>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">For precut sheets, match the label size, margins, and gaps to your paper.</p>
                </details>
              )}
              <MaterialNotice error={validationError || error} />
            </div>

            <div className="flex min-w-0 flex-col bg-slate-50/80 px-6 py-6 sm:px-7">
              <div className="mb-5 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">Label preview</h3><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">Live preview</span></div>
              <div ref={previewContainer} className="flex min-h-[280px] flex-col items-center justify-center gap-5 rounded-2xl border border-slate-200 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[length:14px_14px] px-6 py-7">
                {labelMarkup ? (
                  <>
                    <style>{MATERIAL_LABEL_CSS}</style>
                    <div className="shrink-0 bg-white shadow-[0_6px_24px_#0f172a18] ring-1 ring-slate-200" style={{ width: labelWidthPx * previewScale, height: labelHeightPx * previewScale }}>
                      <div style={{ width: labelWidthPx, height: labelHeightPx, transform: `scale(${previewScale})`, transformOrigin: "top left" }} dangerouslySetInnerHTML={{ __html: labelMarkup }} />
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600"><Ruler className="size-3.5" aria-hidden="true" />{settings.widthMm} × {settings.heightMm} mm</span>
                  </>
                ) : <div className="space-y-3 px-4 py-8 text-center text-slate-500"><Tag className="mx-auto size-8 text-slate-400" aria-hidden="true" /><p className="max-w-[220px] text-sm leading-relaxed">{restored ? "Choose a valid size and quantity to preview your label." : "Preparing your label…"}</p></div>}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <p className="break-words text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="mt-1 break-words text-xs text-slate-500">{presentation.name} · {presentation.multiplier} {product.baseUnit.name}</p>
                {!layout.error && (
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3" aria-live="polite">
                    <div><p className="text-lg font-semibold tabular-nums text-slate-900">{settings.copies}</p><p className="text-[11px] text-slate-500">{settings.copies === 1 ? "Label" : "Labels"}</p></div>
                    <div><p className="text-lg font-semibold tabular-nums text-slate-900">{mode === "sheet" ? `${layout.columns} × ${layout.rows}` : "1"}</p><p className="text-[11px] text-slate-500">{mode === "sheet" ? "Per sheet" : "Per page"}</p></div>
                    <div><p className="text-lg font-semibold tabular-nums text-slate-900">{layout.pageCount}</p><p className="text-[11px] text-slate-500">{mode === "sheet" ? (layout.pageCount === 1 ? "Sheet" : "Sheets") : (layout.pageCount === 1 ? "Page" : "Pages")}</p></div>
                  </div>
                )}
              </div>

              {!validationError && currentBarcode && moduleWidth < 0.25 && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">For easier scanning, use a width of {recommendedBarcodeWidth} mm or more. Test one label with your scanner first.</p>}
              <div className="mt-auto pt-5 text-xs leading-relaxed text-slate-500"><p>Print at <span className="font-semibold text-slate-700">100% / actual size</span>, with headers and footers off.</p><p className="mt-1">{mode === "thermal" ? "Set your printer’s paper size to the same label dimensions." : "Select the same paper size in your printer settings."}</p></div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs leading-relaxed text-slate-500">{preferencesSaved ? "Size and format are remembered on this device." : "Settings apply to this print."}<br />Printing labels does not change stock.</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="outline" disabled={!canPrint} onClick={() => openPrintDocument(false)}><Eye className="size-4" aria-hidden="true" />Preview</Button>
            <Button type="button" className="bg-red-600 text-white hover:bg-red-700" disabled={!canPrint} onClick={() => openPrintDocument(true)}><Printer className="size-4" aria-hidden="true" />{preparing ? "Preparing…" : "Print"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
