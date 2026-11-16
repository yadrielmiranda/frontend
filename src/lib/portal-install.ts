export type InstallHelpKind = "ios" | "android" | "mac-safari" | "desktop" | "secure-site";
export type PortalInstallSnapshot = {
  ready: boolean;
  installed: boolean;
  installing: boolean;
  help: { kind: InstallHelpKind; failed: boolean } | null;
};

type InstallPrompt = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type InstallNavigator = Navigator & {
  standalone?: boolean;
  install?: () => Promise<unknown>;
};

export const INITIAL_PORTAL_INSTALL_STATE: PortalInstallSnapshot = {
  ready: false, installed: false, installing: false, help: null,
};

export function isPortalInstallPath(pathname: string) {
  return !["/technician", "/public", "/company"].some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function helpKind(browser: Window): InstallHelpKind {
  if (!browser.isSecureContext) return "secure-site";
  const { userAgent, maxTouchPoints } = browser.navigator;
  if (/iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  if (/Macintosh/i.test(userAgent) && /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR/i.test(userAgent)) return "mac-safari";
  return "desktop";
}

/** One controller per mounted portal: menu and login share the same single-use prompt. */
export function createPortalInstallController(browser: Window) {
  const navigator = browser.navigator as InstallNavigator;
  const listeners = new Set<() => void>();
  let state = INITIAL_PORTAL_INSTALL_STATE;
  let prompt: InstallPrompt | null = null;
  let active = false;
  let generation = 0;
  let cleanup: (() => void) | undefined;

  function update(patch: Partial<PortalInstallSnapshot>) {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  }

  function stop() {
    active = false;
    generation += 1;
    prompt = null;
    cleanup?.();
    cleanup = undefined;
    update(INITIAL_PORTAL_INSTALL_STATE);
  }

  function start() {
    if (!isPortalInstallPath(browser.location.pathname)) return () => undefined;
    if (active) return stop;
    active = true;
    generation += 1;
    const standalone = browser.matchMedia("(display-mode: standalone)");
    const markInstalled = () => {
      if (!active || !isPortalInstallPath(browser.location.pathname)) return;
      prompt = null;
      update({ installed: true, installing: false, help: null });
    };
    const onDisplayMode = () => {
      if (standalone.matches || navigator.standalone === true) markInstalled();
    };
    const available = (event: Event) => {
      if (!isPortalInstallPath(browser.location.pathname) || state.installed || !browser.isSecureContext) return;
      const candidate = event as InstallPrompt;
      if (typeof candidate.prompt !== "function" || !candidate.userChoice) return;
      event.preventDefault();
      prompt = candidate;
    };
    browser.addEventListener("beforeinstallprompt", available);
    browser.addEventListener("appinstalled", markInstalled);
    standalone.addEventListener("change", onDisplayMode);
    cleanup = () => {
      browser.removeEventListener("beforeinstallprompt", available);
      browser.removeEventListener("appinstalled", markInstalled);
      standalone.removeEventListener("change", onDisplayMode);
    };
    update({ ready: true, installed: standalone.matches || navigator.standalone === true, installing: false, help: null });

    if (browser.isSecureContext && "serviceWorker" in navigator && isPortalInstallPath(browser.location.pathname)) {
      // Online-only navigation fallback. No account data or authenticated responses are cached.
      void navigator.serviceWorker.register("/portal-sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    }
    return stop;
  }

  async function requestInstall() {
    if (!active || !state.ready || state.installed || state.installing || !isPortalInstallPath(browser.location.pathname)) return;
    const nativeInstall = browser.isSecureContext ? navigator.install : undefined;
    const selectedPrompt = browser.isSecureContext ? prompt : null;
    if (typeof nativeInstall !== "function" && !selectedPrompt) {
      update({ help: { kind: helpKind(browser), failed: false } });
      return;
    }

    // Clear before invoking: browser prompts may only be consumed once.
    prompt = null;
    const requestGeneration = generation;
    update({ installing: true, help: null });
    const current = () => active && generation === requestGeneration && isPortalInstallPath(browser.location.pathname);
    try {
      // Invoke immediately in the button's click/select event to preserve user activation.
      if (typeof nativeInstall === "function") {
        await nativeInstall.call(navigator);
        if (current()) update({ installed: true, help: null });
      } else if (selectedPrompt) {
        await selectedPrompt.prompt();
        const choice = await selectedPrompt.userChoice;
        if (current() && choice.outcome === "accepted") update({ installed: true, help: null });
      }
    } catch (error) {
      const name = error && typeof error === "object" && "name" in error ? error.name : "";
      if (current() && !state.installed && name !== "AbortError" && name !== "NotAllowedError") {
        update({ help: { kind: helpKind(browser), failed: true } });
      }
    } finally {
      if (current()) update({ installing: false });
    }
  }

  return {
    start,
    stop,
    requestInstall,
    closeHelp: () => update({ help: null }),
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
