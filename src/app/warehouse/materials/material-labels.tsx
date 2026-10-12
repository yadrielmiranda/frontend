"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { MaterialPresentation, MaterialProduct } from "@/app/api/materials.api";
import { MaterialField, MaterialNotice } from "./materials-shared";

export function MaterialLabels({ product, presentation, onClose }: { product: MaterialProduct; presentation: MaterialPresentation; onClose: () => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [copies, setCopies] = useState("1"), [error, setError] = useState("");
  useEffect(() => { if (!svg.current || !presentation.barcode) return; try { JsBarcode(svg.current, presentation.barcode, { format: "CODE128", width: 2, height: 55, margin: 14, fontSize: 14, displayValue: true }); } catch { setError("This code cannot be printed as Code 128. Use a supported barcode for this presentation."); } }, [presentation.barcode]);
  function print() {
    if (!svg.current || error) return;
    const count = Number(copies); if (!Number.isInteger(count) || count < 1 || count > 200) return;
    const popup = window.open("", "_blank", "width=900,height=650");
    if (!popup) { setError("Allow pop-ups to open printable labels."); return; }
    const doc = popup.document;
    doc.title = `${product.code} labels`;
    const style = doc.createElement("style");
    style.textContent = "body{font:14px Arial,sans-serif;margin:20px}main{display:flex;flex-wrap:wrap;gap:12px}.label{box-sizing:border-box;border:1px dashed #aaa;padding:12px;width:330px;break-inside:avoid;text-align:center}.label p{margin:2px 0;overflow-wrap:anywhere}.label svg{width:100%;height:auto}button{margin-bottom:20px;padding:10px 20px}@media print{button{display:none}.label{border:0}@page{margin:12mm}}";
    doc.head.appendChild(style);
    const button = doc.createElement("button"); button.textContent = "Print labels"; button.onclick = () => popup.print(); doc.body.appendChild(button);
    const main = doc.createElement("main");
    for (let i = 0; i < count; i++) {
      const label = doc.createElement("section"); label.className = "label";
      for (const text of [product.name, `${presentation.name} · ${presentation.multiplier} ${product.baseUnit.name}`, product.code]) { const p = doc.createElement("p"); p.textContent = text; label.appendChild(p); }
      label.appendChild(doc.importNode(svg.current, true)); main.appendChild(label);
    }
    doc.body.appendChild(main);
  }
  return <Dialog open onOpenChange={value => { if (!value) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Print presentation labels</DialogTitle><DialogDescription>All labels use the same barcode for {presentation.name}. No individual box tracking is created.</DialogDescription></DialogHeader><p className="text-sm font-medium">{product.name}</p><svg ref={svg} className="h-auto max-w-full" role="img" aria-label={`Barcode ${presentation.barcode}`} /><MaterialField label="Number of labels"><Input type="number" min={1} max={200} step={1} value={copies} onChange={event => setCopies(event.target.value)} /></MaterialField><MaterialNotice error={error} /><Button disabled={Boolean(error) || !Number.isInteger(Number(copies)) || Number(copies) < 1 || Number(copies) > 200} onClick={print}>Open printable labels</Button></DialogContent></Dialog>;
}
