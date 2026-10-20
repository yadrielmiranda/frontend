"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanBarcode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isApiError } from "@/app/api/_base";
import { warehouseRequestKey, type FactoryPartType, type ScanResult } from "@/app/api/warehouse.api";
import { errorMessage } from "./warehouse-shared";
import { factoryBarcode } from "./factory-parts";

type Pending = { barcode: string; requestKey: string };
export function ScanPad<Result = ScanResult>({
  scope,
  persistent = false,
  disabled,
  retryOnly = false,
  onRead,
  onSaved,
  onPendingChange,
  mobileFocus = false,
  onScanModeChange,
}: {
  scope: string;
  persistent?: boolean;
  disabled?: boolean;
  retryOnly?: boolean;
  onRead: (barcode: string, requestKey: string) => Promise<Result>;
  onSaved: (result: Result) => void;
  onPendingChange?: (pending: boolean) => void;
  mobileFocus?: boolean;
  onScanModeChange?: (active: boolean) => void;
}) {
  const [barcode, setBarcode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null),
    [camera, setCamera] = useState(false),
    [paused, setPaused] = useState(false),
    [scanMode, setScanMode] = useState(false);
  const [partChoice, setPartChoice] = useState<{ lineNumber: string; types: FactoryPartType[] } | null>(null);
  const video = useRef<HTMLVideoElement>(null),
    input = useRef<HTMLInputElement>(null),
    lock = useRef(false);
  const stream = useRef<MediaStream | null>(null),
    controls = useRef<{ stop: () => void } | null>(null),
    generation = useRef(0);
  const focusInput = useRef(false);
  const mounted = useRef(true),
    blocked = useRef(Boolean(disabled));
  blocked.current = Boolean(disabled);
  const storageKey = `warehouse-reading:${scope}`;
  const readingStorage = () => persistent ? localStorage : sessionStorage;

  function stopCameraStream() {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (mounted.current) setCamera(false);
  }
  function endScanMode() {
    stopCameraStream();
    if (mounted.current) setScanMode(false);
  }
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = readingStorage().getItem(storageKey);
      if (saved) {
        const value = JSON.parse(saved) as Pending;
        if (
          typeof value.barcode === "string" &&
          typeof value.requestKey === "string"
        ) {
          setPending(value);
          setBarcode(value.barcode);
          setError(
            "This reading has not been confirmed. Retry it to check whether it was saved.",
          );
        }
      }
    } catch {
      /* El escaneo sigue disponible si el navegador no permite almacenamiento. */
    }
    return () => {
      mounted.current = false;
      stopCameraStream();
    };
    // El padre remonta el lector al cambiar de operación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, persistent]);
  useEffect(() => {
    onPendingChange?.(busy || Boolean(pending) || Boolean(partChoice));
  }, [busy, pending, partChoice, onPendingChange]);
  useEffect(() => {
    onScanModeChange?.(scanMode);
  }, [scanMode, onScanModeChange]);
  useEffect(() => {
    if (disabled || retryOnly) endScanMode();
  }, [disabled, retryOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!busy && !pending && focusInput.current) {
      input.current?.focus();
      focusInput.current = false;
    }
  }, [busy, pending]);
  async function submit(value: string, retry?: Pending) {
    if (lock.current || blocked.current || (!retry && (pending || retryOnly))) return;
    const code = value.trim();
    if (!code) return;
    focusInput.current = document.activeElement === input.current;
    lock.current = true;
    setBusy(true);
    setError("");
    setPartChoice(null);
    stopCameraStream();
    const reading = retry ?? {
      barcode: code,
      requestKey: warehouseRequestKey(),
    };
    setPending(reading);
    try {
      readingStorage().setItem(storageKey, JSON.stringify(reading));
    } catch {
      if (persistent) {
        // No enviar un movimiento técnico sin conservar su clave de reintento.
        setPending(null); setBusy(false); lock.current = false;
        setError("Browser storage is unavailable. Enable site storage before scanning. Nothing was sent.");
        return;
      }
    }
    try {
      const result = await onRead(reading.barcode, reading.requestKey);
      try {
        readingStorage().removeItem(storageKey);
      } catch {
        /* Sin almacenamiento local. */
      }
      if (!mounted.current) return;
      setPending(null);
      setBarcode("");
      setPaused(true);
      onSaved(result);
      navigator.vibrate?.(60);
    } catch (e) {
      if (!mounted.current) return;
      if (isApiError(e) && e.status >= 400 && e.status < 500 &&
          (!persistent || ![401, 403, 408, 429].includes(e.status))) {
        setPending(null);
        try {
          readingStorage().removeItem(storageKey);
        } catch {
          /* Sin almacenamiento local. */
        }
        const data = e.data as { code?: unknown; types?: unknown } | undefined;
        const parsed = factoryBarcode(reading.barcode);
        if (data?.code === "FACTORY_PART_TYPE_REQUIRED" && parsed && Array.isArray(data.types)) {
          const types = data.types.filter((type): type is FactoryPartType => ["DOOR", "FRAME", "WINDOW"].includes(type));
          if (types.length) { setPartChoice({ lineNumber: parsed.lineNumber, types }); setError(""); }
          else setError(errorMessage(e));
        } else setError(errorMessage(e));
      } else
        setError(
          "The reading could not be confirmed. Retry the same reading; it will be saved only once.",
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function startCamera() {
    if (busy || pending || partChoice || disabled || retryOnly) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera scanning needs HTTPS. Use your secure website, a barcode reader, or enter the code below.",
      );
      return;
    }
    stopCameraStream();
    const token = generation.current;
    setError("");
    setScanMode(true);
    setCamera(true);
    setPaused(false);
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      if (!mounted.current || token !== generation.current) return;
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (!mounted.current || token !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);
      let accepted = false;
      const handle = await reader.decodeFromStream(
        media,
        video.current!,
        (result, _error, scanner) => {
          if (
            !result ||
            accepted ||
            token !== generation.current ||
            blocked.current
          )
            return;
          accepted = true;
          scanner.stop();
          setBarcode(result.getText());
          setPaused(true);
          void submit(result.getText());
        },
      );
      if (!mounted.current || accepted || token !== generation.current)
        handle.stop();
      else controls.current = handle;
    } catch (e) {
      if (token !== generation.current || !mounted.current) return;
      stopCameraStream();
      setScanMode(false);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access or use the barcode field."
          : "The camera could not start. Check its permissions or use the barcode field.",
      );
    }
  }
  const focusedMobile = mobileFocus && scanMode;
  return (
    <section
      data-mobile-scan-focused={focusedMobile ? "true" : undefined}
      className={`space-y-4 rounded-xl border bg-white p-4 sm:p-6 ${focusedMobile ? "max-sm:rounded-none max-sm:border-0 max-sm:p-0" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={camera ? endScanMode : startCamera}
          disabled={disabled || retryOnly || busy || Boolean(pending) || Boolean(partChoice)}
        >
          <Camera className="mr-2 h-4 w-4" />
          {camera ? "Stop camera" : paused ? "Scan next part" : "Start camera"}
        </Button>
        <span className={`text-sm text-muted-foreground ${focusedMobile ? "max-sm:hidden" : ""}`}>
          One reading records one physical part.
        </span>
      </div>
      <div
        hidden={!camera}
        className={`overflow-hidden rounded-lg bg-slate-950 ${focusedMobile ? "max-sm:rounded-xl" : ""}`}
      >
        <video
          ref={video}
          muted
          playsInline
          className={`w-full object-contain ${focusedMobile ? "max-sm:max-h-[58dvh] sm:max-h-80" : "max-h-80"}`}
          aria-label="Barcode camera preview"
        />
        <p className="p-3 text-center text-sm text-white">
          Keep the full barcode in view. The camera pauses after one reading.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(barcode);
        }}
        className="space-y-2"
      >
        <Label htmlFor="warehouse-barcode">Barcode or line number</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            ref={input}
            id="warehouse-barcode"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Scan 1029975-DOOR, -FRAME, -WINDOW or I1029975"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={disabled || retryOnly || busy || Boolean(pending) || Boolean(partChoice)}
          />
          <Button
            disabled={disabled || retryOnly || busy || Boolean(pending) || Boolean(partChoice) || !barcode.trim()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanBarcode className="mr-2 h-4 w-4" />
            )}
            Record part
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A USB or Bluetooth reader can enter the code here and send Enter. For
          a shared barcode, scan each physical part once.
        </p>
      </form>
      {partChoice && <div role="group" aria-label="Choose the scanned part" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium">Line {partChoice.lineNumber}: is this a door panel or its frame?</p>
        <p className="text-xs text-muted-foreground">The older barcode does not identify the part type. Choose the physical part you scanned.</p>
        <div className="flex flex-wrap gap-2">
          {partChoice.types.map(type => <Button key={type} type="button" disabled={disabled || busy}
            onClick={() => void submit(`${partChoice.lineNumber}-${type}`)}>
            {type === "DOOR" ? "Door panel" : type === "FRAME" ? "Frame" : "Other piece"}
          </Button>)}
          <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => { setPartChoice(null); setError(""); input.current?.focus(); }}>Cancel</Button>
        </div>
      </div>}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {pending && !busy && (
        <Button
          onClick={() => void submit(pending.barcode, pending)}
          disabled={disabled}
        >
          Retry same reading
        </Button>
      )}
    </section>
  );
}
