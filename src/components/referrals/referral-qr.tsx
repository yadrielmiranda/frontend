"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReferralQr({
  url,
  label = "Scan to create an account using your referral link",
  filename = "referral-qr.svg",
}: { url: string; label?: string; filename?: string }) {
  const [download, setDownload] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let canceled = false;
    let objectUrl: string | undefined;
    setDownload(null);
    setError(false);
    import("@zxing/browser").then(({ BrowserQRCodeSvgWriter }) => {
      if (canceled) return;
      const svg = new BrowserQRCodeSvgWriter().write(url, 224, 224);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", label);
      svg.style.background = "white";
      const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      background.setAttribute("width", "100%");
      background.setAttribute("height", "100%");
      background.setAttribute("fill", "white");
      svg.prepend(background);
      objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
      setDownload(objectUrl);
    }).catch(() => { if (!canceled) setError(true); });
    return () => { canceled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, label]);
  return <div className="flex flex-col items-center gap-3">
    <div className="flex min-h-56 min-w-56 items-center justify-center rounded-xl border bg-white p-2">
      {download ? <Image src={download} alt={label} width={224} height={224} unoptimized /> : error ? <p className="max-w-48 text-center text-sm">Could not generate the QR code. You can still copy the link.</p> : <span className="text-sm text-muted-foreground">Preparing QR code…</span>}
    </div>
    {download && <Button variant="outline" size="sm" asChild><a href={download} download={filename}><Download className="mr-2 h-4 w-4" />Download QR</a></Button>}
  </div>;
}
