"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPortalInstallController, INITIAL_PORTAL_INSTALL_STATE, isPortalInstallPath, type InstallHelpKind } from "@/lib/portal-install";

type PortalInstallContextValue = {
  visible: boolean;
  installing: boolean;
  requestInstall: () => Promise<void>;
};

const PortalInstallContext = createContext<PortalInstallContextValue>({
  visible: false, installing: false, requestInstall: async () => undefined,
});
const subscribeNothing = () => () => undefined;
const initialSnapshot = () => INITIAL_PORTAL_INSTALL_STATE;

function InstallationSteps({ kind }: { kind: InstallHelpKind }) {
  if (kind === "secure-site") return <p className="text-sm text-slate-600">Open the secure (HTTPS) version of this website to install the portal.</p>;

  const steps: Record<Exclude<InstallHelpKind, "secure-site">, ReactNode[]> = {
    ios: [
      <>Open this portal in <strong>Safari</strong>.</>,
      <>Tap <strong>Share</strong> (you may find it inside the page menu).</>,
      <>Choose <strong>Add to Home Screen</strong>.</>,
      <>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</>,
    ],
    android: [
      <>Open this portal in <strong>Chrome</strong>, outside any email or messaging app.</>,
      <>Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>,
      <>Confirm to add <strong>Authentic Evolution</strong> to your device.</>,
    ],
    "mac-safari": [
      <>In Safari, open <strong>File</strong> or <strong>Share</strong>.</>,
      <>Choose <strong>Add to Dock</strong> and confirm with <strong>Add</strong>.</>,
      <>Open <strong>Authentic Evolution</strong> from your Dock or Applications.</>,
    ],
    desktop: [
      <>Open this portal in <strong>Chrome</strong> or <strong>Microsoft Edge</strong>.</>,
      <>Look in the address bar or browser menu for <strong>Install app</strong> or <strong>Install this site as an app</strong>.</>,
      <>Confirm to add <strong>Authentic Evolution</strong> to your applications.</>,
    ],
  };
  return <>
    <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
      {steps[kind].map((step, index) => <li key={index} className="pl-1">{step}</li>)}
    </ol>
    {kind === "ios" && <p className="text-xs leading-relaxed text-slate-500">If Add to Home Screen is missing, choose Edit Actions in the Share menu to add it.</p>}
    {kind === "mac-safari" && <p className="text-xs text-slate-500">Requires macOS Sonoma 14 or later.</p>}
    {(kind === "desktop" || kind === "android") && <p className="text-xs leading-relaxed text-slate-500">If no install option appears, the app may already be installed or installation may be unavailable in this browser. You can keep using the portal here.</p>}
  </>;
}

export function PortalInstallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const enabled = isPortalInstallPath(pathname);
  const [controller] = useState(() => typeof window === "undefined" ? null : createPortalInstallController(window));
  const state = useSyncExternalStore(controller?.subscribe ?? subscribeNothing, controller?.getSnapshot ?? initialSnapshot, initialSnapshot);

  useEffect(() => {
    if (enabled && controller) return controller.start();
  }, [controller, enabled]);

  return <PortalInstallContext.Provider value={{
    visible: enabled && state.ready && !state.installed,
    installing: state.installing,
    requestInstall: controller?.requestInstall ?? (async () => undefined),
  }}>
    {children}
    <Dialog open={enabled && state.help !== null} onOpenChange={open => { if (!open) controller?.closeHelp(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><Download className="h-5 w-5" aria-hidden="true" /></div>
          <DialogTitle>Install Authentic Evolution</DialogTitle>
          <DialogDescription>Keep the portal on your home screen or desktop for quick access.</DialogDescription>
        </DialogHeader>
        {state.help?.failed && <p role="status" className="text-sm text-slate-600">The installation could not start. Try the steps below using your browser menu.</p>}
        {state.help && <InstallationSteps kind={state.help.kind} />}
        <p className="border-t pt-4 text-xs text-slate-500">Use your usual account to sign in. An internet connection is required.</p>
        <DialogFooter><Button type="button" onClick={() => controller?.closeHelp()}>Got it</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </PortalInstallContext.Provider>;
}

export function usePortalInstall() { return useContext(PortalInstallContext); }
