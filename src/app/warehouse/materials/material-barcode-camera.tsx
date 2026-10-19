"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Camera, Loader2, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { materialCameraErrorMessage, startMaterialCamera } from "./material-barcode-camera-session";

async function loadMaterialBarcodeReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType, NotFoundException, ChecksumException, FormatException }] = await Promise.all([
    import("@zxing/browser"), import("@zxing/library"),
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    // ZXing 0.21.3's experimental UPC-E reader cannot reliably decode its digits.
    BarcodeFormat.UPC_A, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.ITF, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
    BarcodeFormat.CODABAR,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new BrowserMultiFormatReader(hints);
  return {
    read(video: HTMLVideoElement) {
      try {
        return reader.decode(video).getText();
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return null;
        throw error;
      }
    },
  };
}

function MaterialCameraPreview({ onDetected, onClose, stopCapture }: { onDetected: (code: string) => void; onClose: () => void; stopCapture: RefObject<() => void> }) {
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onDetected, onClose });
  callbacks.current = { onDetected, onClose };
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(false);
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning needs a secure HTTPS connection and a browser with camera access. You can still enter the barcode manually or use a barcode reader.");
      return;
    }
    if (!video.current) return;
    const stop = startMaterialCamera({
      video: video.current,
      loadReader: loadMaterialBarcodeReader,
      getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
      onReady: () => setReady(true),
      onDetected: (code) => callbacks.current.onDetected(code),
      onError: (failure) => { setReady(false); setError(materialCameraErrorMessage(failure)); },
    });
    stopCapture.current = stop;
    const close = () => { stop(); callbacks.current.onClose(); };
    const visibilityChanged = () => { if (document.hidden) close(); };
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", close);
    if (document.hidden) close();
    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", close);
      stop();
      if (stopCapture.current === stop) stopCapture.current = () => {};
    };
  }, [attempt, stopCapture]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl bg-slate-950">
        <video ref={video} muted playsInline autoPlay className="aspect-[4/3] max-h-[48dvh] w-full object-contain" aria-label="Material barcode camera preview" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6" aria-hidden="true">
          <div className="h-28 w-full max-w-sm rounded-lg border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.15)]" />
        </div>
        {!ready && !error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-white" role="status"><Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" /><span>Opening camera…</span></div>}
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div> : <div className="flex gap-2 text-sm text-muted-foreground"><ScanBarcode className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><p>Keep the entire barcode inside the frame with good lighting. The camera closes after one reading.</p></div>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        {error && <Button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>}
      </div>
    </div>
  );
}

export function MaterialBarcodeCamera({ onDetected, disabled = false, label = "Scan with camera" }: {
  onDetected: (code: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const blocked = useRef(disabled);
  const opened = useRef(false);
  const stopCapture = useRef<() => void>(() => {});
  blocked.current = disabled;
  const changeOpen = (next: boolean) => {
    opened.current = next && !blocked.current;
    if (!opened.current) stopCapture.current();
    setOpen(opened.current);
  };
  // Do not reopen a previously interrupted scan when the surrounding form is enabled again.
  useEffect(() => { if (disabled) { opened.current = false; stopCapture.current(); setOpen(false); } }, [disabled]);
  return (
    <Dialog open={open && !disabled} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="shrink-0"><Camera className="mr-2 h-4 w-4" aria-hidden="true" />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan material barcode</DialogTitle>
          <DialogDescription>Read the barcode on a unit or package. Scanning only selects a code; review the details before saving or confirming.</DialogDescription>
        </DialogHeader>
        {open && !disabled && <MaterialCameraPreview stopCapture={stopCapture} onClose={() => changeOpen(false)} onDetected={(code) => { if (blocked.current || !opened.current) return; changeOpen(false); onDetected(code); }} />}
      </DialogContent>
    </Dialog>
  );
}
