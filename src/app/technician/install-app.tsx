"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if ("serviceWorker" in navigator && window.isSecureContext)
      void navigator.serviceWorker.register("/technician-sw.js", { scope: "/technician", updateViaCache: "none" }).catch(() => undefined);
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return null;
  return <div className="text-center text-xs text-slate-500">
    {prompt ? <Button variant="outline" className="min-h-11" onClick={async () => {
      try { await prompt.prompt(); await prompt.userChoice; } finally { setPrompt(null); }
    }}>Add to Home Screen</Button> : <details><summary className="cursor-pointer py-3">Add to Home Screen</summary><p className="pb-3">iPhone: open in Safari, then Share → Add to Home Screen. Android: open the browser menu and choose Install app or Add to Home screen.</p></details>}
  </div>;
}
