"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import { Notification } from "@/lib/types";
import { getNotifications } from "@/app/api/notifications.api";
import { getProfileSilent, loginUser, type LoginData } from "@/app/api/auth/me/auth.api";
import { getPlatformTermsStatus, type PlatformTermsStatus } from "@/app/api/platform-terms.api";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import type { AuthUser } from "@/app/types/auth";
import {
  navigateAfterSessionChange,
  notifySessionChange,
  SESSION_CHANGE_STORAGE_KEY,
  SESSION_RESET_EVENT,
} from "@/lib/auth-session";

type AuthContextType = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  revalidate: () => Promise<AuthUser | null>;
  signIn: (credentials: LoginData) => Promise<AuthUser | null>;
  loginTerms: { userId: number; status: PlatformTermsStatus } | null;

  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  refreshNotifications: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const IDLE_MS = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? 10) * 60 * 1000;
const PROBE_EVERY_MS = 30 * 1000;
const identity = (user: AuthUser) => `${user.id}:${user.role?.name ?? ""}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { openLoginDialog, closeLoginDialog } = useLoginDialog();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginTerms, setLoginTerms] = useState<AuthContextType["loginTerms"]>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const currentUserRef = useRef<AuthUser | null>(null);
  // Se conserva tras expirar: otra cuenta nunca puede reutilizar esta pantalla.
  const lastIdentityRef = useRef<string | null>(null);
  const transitionRef = useRef(false);
  const authRequestRef = useRef(0);
  const authInFlightRef = useRef(false);
  const loginInFlightRef = useRef(false);
  const notificationRequestRef = useRef(0);
  const notificationsInFlightRef = useRef(false);
  const probeInFlightRef = useRef(false);
  const idleProbeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUser = useCallback(() => {
    currentUserRef.current = null;
    notificationRequestRef.current++;
    setUserState(null);
    setIsAuthenticated(false);
    setNotifications([]);
  }, []);

  useEffect(() => {
    const onReset = () => {
      transitionRef.current = true;
      authRequestRef.current++;
      clearUser();
      setLoginTerms(null);
      setIsLoading(true);
      setIsTransitioning(true);
      closeLoginDialog();
      toast.dismiss();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_CHANGE_STORAGE_KEY || !event.newValue) return;
      navigateAfterSessionChange("/", false);
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // El historial del navegador también puede restaurar un documento de otra sesión.
      if (event.persisted) {
        navigateAfterSessionChange(window.location.pathname + window.location.search, false);
      }
    };
    window.addEventListener(SESSION_RESET_EVENT, onReset);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      authRequestRef.current++;
      notificationRequestRef.current++;
      window.removeEventListener(SESSION_RESET_EVENT, onReset);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [clearUser, closeLoginDialog]);

  const refreshNotifications = useCallback(async () => {
    const account = currentUserRef.current;
    if (!account || account.role?.name === "technician" || transitionRef.current || notificationsInFlightRef.current) return;
    notificationsInFlightRef.current = true;
    const request = ++notificationRequestRef.current;
    try {
      const latest = await getNotifications();
      if (!transitionRef.current && request === notificationRequestRef.current &&
          currentUserRef.current && identity(currentUserRef.current) === identity(account)) {
        setNotifications(latest);
      }
    } catch {
      // La validación de sesión se encarga de los errores de autenticación.
    } finally {
      notificationsInFlightRef.current = false;
    }
  }, []);

  const signIn = useCallback(async (credentials: LoginData): Promise<AuthUser | null> => {
    if (transitionRef.current || loginInFlightRef.current) return null;
    loginInFlightRef.current = true;
    const request = ++authRequestRef.current;
    authInFlightRef.current = true;
    setError(null);
    try {
      const result = await loginUser(credentials);
      if (request !== authRequestRef.current || transitionRef.current) return null;

      // Solo se entra sin recargar desde un documento que no haya mostrado otra cuenta.
      // El cierre explícito ya descarta los datos y la caché privada de la sesión anterior.
      const cleanLoginPage = lastIdentityRef.current === null &&
        (window.location.pathname === "/" || window.location.pathname === "/login");
      if (!cleanLoginPage || result.role === "technician") {
        navigateAfterSessionChange(result.role === "technician" ? "/technician" : "/");
        return null;
      }

      // Las demás pestañas descartan su cuenta anterior en cuanto cambian las cookies.
      notifySessionChange();
      const account = (await getProfileSilent()) as AuthUser;
      if (request !== authRequestRef.current || transitionRef.current) return null;
      if (account.role?.name === "technician") {
        navigateAfterSessionChange("/technician", false);
        return null;
      }
      const terms = await getPlatformTermsStatus(true);
      if (request !== authRequestRef.current || transitionRef.current) return null;

      // Publicar cuenta y términos juntos evita desmontar el login para mostrar una espera.
      lastIdentityRef.current = identity(account);
      currentUserRef.current = account;
      setLoginTerms({ userId: account.id, status: terms });
      setUserState(account);
      setIsAuthenticated(true);
      closeLoginDialog();
      void refreshNotifications();
      return account;
    } catch (err: unknown) {
      if (request !== authRequestRef.current || transitionRef.current) return null;
      setError(err instanceof Error ? err.message : "Could not sign in.");
      throw err;
    } finally {
      loginInFlightRef.current = false;
      if (request === authRequestRef.current) {
        authInFlightRef.current = false;
        if (!transitionRef.current) setIsLoading(false);
      }
    }
  }, [closeLoginDialog, refreshNotifications]);

  const fetchUser = useCallback(async (silent: boolean): Promise<AuthUser | null> => {
    if (transitionRef.current || loginInFlightRef.current) return null;
    const request = ++authRequestRef.current;
    authInFlightRef.current = true;
    setError(null);
    try {
      // El error se procesa aquí solo si esta solicitud sigue vigente.
      const account = (await getProfileSilent()) as AuthUser;
      if (request !== authRequestRef.current || transitionRef.current) return null;

      const nextIdentity = identity(account);
      if (lastIdentityRef.current !== null && lastIdentityRef.current !== nextIdentity) {
        // No publicar la cuenta nueva dentro del árbol ni las rutas de la anterior.
        navigateAfterSessionChange(account.role?.name === "technician" ? "/technician" : "/");
        return null;
      }

      lastIdentityRef.current = nextIdentity;
      currentUserRef.current = account;
      setUserState(account);
      setIsAuthenticated(true);
      closeLoginDialog();
      void refreshNotifications();
      return account;
    } catch (err: unknown) {
      if (request !== authRequestRef.current || transitionRef.current) return null;
      clearUser();
      setError(err instanceof Error ? err.message : "Unauthorized");
      if (!silent) openLoginDialog("expired");
      return null;
    } finally {
      if (request === authRequestRef.current) {
        authInFlightRef.current = false;
        if (!transitionRef.current) setIsLoading(false);
      }
    }
  }, [clearUser, closeLoginDialog, openLoginDialog, refreshNotifications]);

  // Ahora await revalidate() espera la respuesta y la comprobación de identidad.
  const revalidate = useCallback(async () => {
    const account = await fetchUser(true);
    if (!account && !transitionRef.current) {
      throw new Error("Could not verify your session. Please sign in again.");
    }
    return account;
  }, [fetchUser]);

  useEffect(() => {
    void fetchUser(true);
  }, [fetchUser]);

  const probeBackendSession = useCallback(async () => {
    if (probeInFlightRef.current || authInFlightRef.current || transitionRef.current || !currentUserRef.current) return;
    probeInFlightRef.current = true;
    try { await fetchUser(false); }
    finally { probeInFlightRef.current = false; }
  }, [fetchUser]);

  const scheduleIdleProbe = useCallback(() => {
    if (idleProbeTimerRef.current) clearTimeout(idleProbeTimerRef.current);
    if (!currentUserRef.current || transitionRef.current) return;
    idleProbeTimerRef.current = setTimeout(() => void probeBackendSession(), IDLE_MS);
  }, [probeBackendSession]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    let frame: number | null = null;
    const onInteraction = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        scheduleIdleProbe();
      });
    };
    scheduleIdleProbe();
    events.forEach((event) => window.addEventListener(event, onInteraction, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, onInteraction));
      if (frame !== null) cancelAnimationFrame(frame);
      if (idleProbeTimerRef.current) clearTimeout(idleProbeTimerRef.current);
    };
  }, [isAuthenticated, scheduleIdleProbe]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => void probeBackendSession();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void probeBackendSession();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(onVisibility, PROBE_EVERY_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, [isAuthenticated, probeBackendSession]);

  // Los cambios de perfil solo pueden actualizar la identidad ya validada.
  const setUser = useCallback((account: AuthUser | null) => {
    if (transitionRef.current) return;
    if (!account) {
      authRequestRef.current++;
      clearUser();
    } else if (currentUserRef.current && identity(account) === identity(currentUserRef.current)) {
      currentUserRef.current = account;
      setUserState(account);
    }
  }, [clearUser]);

  useEffect(() => {
    const socketsEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET === "true";
    if (!socketsEnabled || !isAuthenticated || !user?.id || user.role?.name === "technician") return;

    const accountIdentity = identity(user);
    const socket: Socket = io(API_URL, { withCredentials: true, transports: ["websocket"] });
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    socket.on("disconnect", (reason) => {
      if (reason !== "io server disconnect" || disposed) return;
      reconnectTimer = setTimeout(() => {
        void revalidate().then((account) => {
          if (!disposed && !transitionRef.current && account && identity(account) === accountIdentity) socket.connect();
        }).catch(() => undefined);
      }, 1000);
    });
    socket.on("new_notification", (notification: Notification) => {
      if (disposed || transitionRef.current || !currentUserRef.current || identity(currentUserRef.current) !== accountIdentity) return;
      toast.info(notification.message);
      setNotifications((previous) => [notification, ...previous.filter((item) => item.id !== notification.id)]);
    });
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id, user?.role?.name, revalidate]);

  const value: AuthContextType = {
    isAuthenticated, user, isLoading, error, setUser, revalidate, signIn, loginTerms,
    notifications, unreadCount, setNotifications, refreshNotifications,
  };

  return <AuthContext.Provider value={value}>
    {isTransitioning
      ? <AuthLoadingScreen />
      : children}
  </AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
