"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanBarcode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isApiError } from "@/app/api/_base";
import { warehouseRequestKey, type ScanResult } from "@/app/api/warehouse.api";
import { errorMessage } from "./warehouse-shared";

type Pending = { barcode: string; requestKey: string };
export function ScanPad({
  scope,
  disabled,
  onRead,
  onSaved,
  onPendingChange,
}: {
  scope: string;
  disabled?: boolean;
  onRead: (barcode: string, requestKey: string) => Promise<ScanResult>;
  onSaved: (result: ScanResult) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [barcode, setBarcode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null),
    [camera, setCamera] = useState(false),
    [paused, setPaused] = useState(false);
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

  function stopCamera() {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (mounted.current) setCamera(false);
  }
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = sessionStorage.getItem(storageKey);
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
      stopCamera();
    };
    // El padre remonta el lector al cambiar de operación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  useEffect(() => {
    onPendingChange?.(busy || Boolean(pending));
  }, [busy, pending, onPendingChange]);
  useEffect(() => {
    if (disabled) stopCamera();
  }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!busy && !pending && focusInput.current) {
      input.current?.focus();
      focusInput.current = false;
    }
  }, [busy, pending]);
  async function submit(value: string, retry?: Pending) {
    if (lock.current || blocked.current || (!retry && pending)) return;
    const code = value.trim();
    if (!code) return;
    focusInput.current = document.activeElement === input.current;
    lock.current = true;
    setBusy(true);
    setError("");
    stopCamera();
    const reading = retry ?? {
      barcode: code,
      requestKey: warehouseRequestKey(),
    };
    setPending(reading);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(reading));
    } catch {
      /* Sin almacenamiento local. */
    }
    try {
      const result = await onRead(reading.barcode, reading.requestKey);
      try {
        sessionStorage.removeItem(storageKey);
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
      if (isApiError(e) && e.status >= 400 && e.status < 500) {
        setPending(null);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Sin almacenamiento local. */
        }
        setError(errorMessage(e));
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
    if (busy || pending || disabled) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera scanning needs HTTPS. Use your secure website, a barcode reader, or enter the code below.",
      );
      return;
    }
    stopCamera();
    const token = generation.current;
    setError("");
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
      stopCamera();
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access or use the barcode field."
          : "The camera could not start. Check its permissions or use the barcode field.",
      );
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={camera ? stopCamera : startCamera}
          disabled={disabled || busy || Boolean(pending)}
        >
          <Camera className="mr-2 h-4 w-4" />
          {camera ? "Stop camera" : paused ? "Scan next part" : "Start camera"}
        </Button>
        <span className="text-sm text-muted-foreground">
          One reading records one physical part.
        </span>
      </div>
      <div hidden={!camera} className="overflow-hidden rounded-lg bg-slate-950">
        <video
          ref={video}
          muted
          playsInline
          className="max-h-80 w-full object-contain"
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
            placeholder="Scan I1029975 or enter the line number"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={disabled || busy || Boolean(pending)}
          />
          <Button
            disabled={disabled || busy || Boolean(pending) || !barcode.trim()}
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
