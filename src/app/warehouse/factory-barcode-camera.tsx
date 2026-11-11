"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Camera, Loader2, ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { materialCameraErrorMessage as cameraErrorMessage, startMaterialCamera as startCameraSession } from "./materials/material-barcode-camera-session";
import { BarcodeScanGuide } from "./barcode-scan-guide";
import { readBarcodeRegion } from "./barcode-scan-region";

async function loadFactoryBarcodeReader(getRegion: () => HTMLDivElement | null) {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType, NotFoundException, ChecksumException, FormatException }] = await Promise.all([
    import("@zxing/browser"), import("@zxing/library"),
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new BrowserMultiFormatReader(hints);
  let canvas: HTMLCanvasElement | null = null;
  return {
    read(video: HTMLVideoElement) {
      const region = getRegion();
      if (!region) return null;
      canvas ??= document.createElement("canvas");
      const cropped = readBarcodeRegion(video, region, canvas);
      if (!cropped) return null;
      try {
        return reader.decodeFromCanvas(cropped).getText();
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return null;
        throw error;
      }
    },
  };
}

function FactoryCameraPreview({ onDetected, onClose, stopCapture }: {
  onDetected: (code: string) => void;
  onClose: () => void;
  stopCapture: RefObject<() => void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const region = useRef<HTMLDivElement>(null);
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
    const stop = startCameraSession({
      video: video.current,
      loadReader: () => loadFactoryBarcodeReader(() => region.current),
      getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
      onReady: () => setReady(true),
      onDetected: (code) => callbacks.current.onDetected(code),
      onError: (failure) => { setReady(false); setError(cameraErrorMessage(failure)); },
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

  return <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
    <div className="relative min-h-24 flex-1 overflow-hidden rounded-xl bg-slate-950 sm:flex-none">
      <video ref={video} muted playsInline autoPlay className="h-full min-h-0 w-full object-contain object-center sm:aspect-[4/3] sm:h-auto sm:max-h-[55dvh]" aria-label="Factory part barcode camera preview" />
      <BarcodeScanGuide regionRef={region} />
      {!ready && !error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-white" role="status"><Loader2 className="size-7 animate-spin" aria-hidden="true" /><span>Opening camera…</span></div>}
    </div>
    {error ? <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div> : <div className="flex shrink-0 gap-2 text-sm text-muted-foreground"><ScanBarcode className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p>Place one complete barcode inside the frame, along the red line. Only this area is scanned. Scan each physical part once.</p></div>}
    <div className="flex shrink-0 justify-end gap-2">
      <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>Cancel</Button>
      {error && <Button type="button" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>}
    </div>
  </div>;
}

export function FactoryBarcodeCamera({ onDetected, disabled = false, prominent = false, label = "Scan with camera" }: {
  onDetected: (code: string) => void;
  disabled?: boolean;
  prominent?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const blocked = useRef(disabled);
  const opened = useRef(false);
  const session = useRef(0);
  const stopCapture = useRef<() => void>(() => {});
  const trigger = useRef<HTMLButtonElement>(null);
  blocked.current = disabled;
  const changeOpen = (next: boolean) => {
    const nextOpen = next && !blocked.current;
    if (opened.current !== nextOpen) session.current++;
    opened.current = nextOpen;
    if (!opened.current) stopCapture.current();
    setOpen(opened.current);
  };
  useEffect(() => {
    if (disabled) { session.current++; opened.current = false; stopCapture.current(); setOpen(false); }
  }, [disabled]);
  useEffect(() => () => { session.current++; opened.current = false; stopCapture.current(); }, []);
  const currentSession = session.current;

  return <Dialog open={open && !disabled} onOpenChange={changeOpen}>
    <DialogTrigger asChild>
      <Button ref={trigger} type="button" variant={prominent ? "default" : "outline"} disabled={disabled} className={prominent ? "h-16 w-full gap-3 rounded-xl bg-orange-700 px-5 text-lg font-bold text-white shadow-sm hover:bg-orange-800 focus-visible:ring-orange-600/50 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100 disabled:shadow-none" : "shrink-0"}><Camera className={prominent ? "size-7" : "mr-2 h-4 w-4"} aria-hidden="true" />{label}</Button>
    </DialogTrigger>
    <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-3xl max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:pt-[max(1rem,env(safe-area-inset-top))] max-sm:pr-[max(1rem,env(safe-area-inset-right))] max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:pl-[max(1rem,env(safe-area-inset-left))]" onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
      <DialogHeader className="shrink-0 flex-row items-start justify-between gap-3 text-left">
        <div className="space-y-2">
          <DialogTitle>Scan factory part</DialogTitle>
          <DialogDescription>Each scan records one physical part. The camera closes after each reading.</DialogDescription>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Close camera" onClick={() => changeOpen(false)}><X className="size-5" aria-hidden="true" /></Button>
      </DialogHeader>
      {open && !disabled && <FactoryCameraPreview stopCapture={stopCapture} onClose={() => changeOpen(false)} onDetected={(code) => { if (blocked.current || !opened.current || session.current !== currentSession) return; changeOpen(false); onDetected(code); }} />}
    </DialogContent>
  </Dialog>;
}
