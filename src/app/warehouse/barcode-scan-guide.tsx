import type { RefObject } from "react";

export function BarcodeScanGuide({ regionRef }: { regionRef: RefObject<HTMLDivElement | null> }) {
  return <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6" aria-hidden="true">
    <div ref={regionRef} className="relative h-28 max-h-full w-full max-w-sm outline-2 outline-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.15)]">
      <div className="absolute inset-x-3 top-1/2 h-px bg-red-500/80" />
    </div>
  </div>;
}
