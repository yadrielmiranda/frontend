"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { isAddressLocation } from "@/lib/use-address-confirmation";
import { loadAddressMap, locationDistanceMeters, mapPosition, onAddressMapAuthFailure, type AddressMarker } from "@/lib/google-address-map";
import type { AddressLocation } from "@/lib/types";

export function AddressLocationMap({ center, maxAdjustmentMeters, disabled, onConfirm }: {
  center: AddressLocation; maxAdjustmentMeters: number; disabled: boolean;
  onConfirm: (point: AddressLocation) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<AddressMarker | null>(null);
  const locked = useRef(disabled);
  locked.current = disabled;
  const [point, setPoint] = useState(center);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const listeners: Array<{ remove(): void }> = [];
    let ownMarker: AddressMarker | null = null;
    let authorized = true;
    let visible = false;
    let failed = false;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const removeAuthListener = onAddressMapAuthFailure(message => {
      authorized = false;
      clearTimeout(readyTimer);
      if (active) { setError(message); setStatus("error"); }
      if (ownMarker) ownMarker.gmpDraggable = false;
    });
    setStatus("loading");
    setPoint(center);
    void loadAddressMap().then(maps => {
      if (!active || !authorized || !container.current) return;
      const map = new maps.Map(container.current, { center, zoom: 19,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID, streetViewControl: false,
        fullscreenControl: false, mapTypeControl: false, clickableIcons: false });
      ownMarker = new maps.marker.AdvancedMarkerElement({ map, position: center,
        gmpDraggable: false, title: "Installation or delivery entrance. Drag to adjust the location." });
      marker.current = ownMarker;
      const select = (position: AddressLocation | null) => {
        if (active && visible && authorized && !locked.current && isAddressLocation(position)) {
          ownMarker!.position = position;
          setPoint(position);
        }
      };
      listeners.push(ownMarker.addListener("dragend", () => select(mapPosition(ownMarker?.position))));
      listeners.push(map.addListener("click", event => select(mapPosition(event.latLng))));
      listeners.push(map.addListener("tilesloaded", () => {
        if (!active || !authorized || failed) return;
        clearTimeout(readyTimer);
        visible = true;
        ownMarker!.gmpDraggable = !locked.current;
        setStatus("ready");
      }));
      readyTimer = setTimeout(() => {
        if (!active || visible) return;
        failed = true;
        setError("The map could not be displayed. Check your connection or browser protection and try again.");
        setStatus("error");
      }, 20000);
    }).catch(reason => {
      if (active) { setError(reason instanceof Error ? reason.message : "The map could not load."); setStatus("error"); }
    });
    return () => {
      active = false;
      clearTimeout(readyTimer);
      removeAuthListener();
      listeners.forEach(listener => listener.remove());
      if (ownMarker) ownMarker.map = null;
      marker.current = null;
    };
    // Coordinate values keep the same map instance across ordinary form renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, attempt]);
  useEffect(() => { if (marker.current) marker.current.gmpDraggable = !disabled && status === "ready"; }, [disabled, status]);
  const tooFar = locationDistanceMeters(center, point) > maxAdjustmentMeters + 1e-6;
  return <div className="space-y-3">
    <p className="text-sm">Confirm the building or entrance on the map. Drag the pin or click its exact location.</p>
    <p className="text-xs text-muted-foreground">Keyboard: focus the pin, press Alt + Enter (Option + Enter on Mac), use the arrow keys, then press Enter.</p>
    <div ref={container} role="region" aria-label="Address location map" aria-busy={status === "loading"}
      className="h-80 w-full rounded-md border bg-slate-100" />
    {status === "loading" && <p role="status" className="text-sm">Loading location map…</p>}
    {status === "error" && <div role="alert" className="space-y-2 text-sm text-red-700">
      <p>{error}</p><Button type="button" variant="outline" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Retry map</Button>
    </div>}
    {status === "ready" && <>
      <p aria-live="polite" className="text-sm">{tooFar
        ? `Choose a location within ${maxAdjustmentMeters} meters of this address, or edit the address.`
        : "Check the pin, then confirm this location to continue."}</p>
      <Button type="button" disabled={disabled || tooFar} onClick={() => onConfirm(point)}>Confirm this location</Button>
    </>}
  </div>;
}
