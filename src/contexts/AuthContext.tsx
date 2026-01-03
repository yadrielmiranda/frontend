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
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import { Notification } from "@/app/api/types";
import { getNotifications } from "@/app/api/notifications.api";
import { getProfile, getProfileSilent } from "@/app/api/auth/me/auth.api";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import type { AuthUser } from "@/app/types/auth";

type AuthContextType = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  revalidate: () => void;

  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ✅ Idle “UI”: SOLO define cuándo hacemos probe al backend (NO desloguea local)
const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? 10);
const IDLE_MS = IDLE_MINUTES * 60 * 1000;

// ✅ Probe periódico: detecta expiración del backend aunque idle UI no se haya cumplido todavía
const PROBE_EVERY_MS = 30 * 1000; // 30s (recomendado 20–30s)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { openLoginDialog, closeLoginDialog } = useLoginDialog();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ---------------------------------------
  // ✅ Refs de control
  // ---------------------------------------

  // Última interacción del usuario (mouse/tecla/click/etc)
  const lastInteractionRef = useRef<number>(Date.now());

  // Timer que dispara el probe al cumplirse el idle (sin depender de requests)
  const idleProbeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Evita probes concurrentes
  const probeInFlightRef = useRef(false);

  // Usuario anterior para detectar “login con usuario diferente”
  const lastUserIdRef = useRef<number | null>(null);

  // Interval probe periódico
  const periodicProbeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------
  // ✅ Probe real al backend (autoridad)
  // ---------------------------------------
  const probeBackendSession = useCallback(async () => {
    if (probeInFlightRef.current) return;
    probeInFlightRef.current = true;

    try {
      // ✅ getProfile usa apiFetch -> refresh-on-401 (1 vez) incluido
      const u = (await getProfile()) as AuthUser;

      const newId = u?.id ?? null;
      const oldId = lastUserIdRef.current;

      // ✅ Sesión OK (backend dice que sí)
      setUser(u);
      setIsAuthenticated(true);
      setError(null);

      // ✅ Si modal estaba abierto, cerrarlo
      closeLoginDialog();

      // ✅ Si cambió el usuario, mandar a "/"
      if (oldId !== null && newId !== null && oldId !== newId) {
        router.push("/");
        router.refresh();
      }

      // Guardar usuario actual
      lastUserIdRef.current = newId;

      // ✅ Consideramos esto como “confirmación” → reinicia el reloj de interacción
      lastInteractionRef.current = Date.now();
    } catch (err: any) {
      // ❌ Backend no autoriza (sesión expirada real o inválida)
      setUser(null);
      setIsAuthenticated(false);
      setNotifications([]);
      setError(err?.message || "Unauthorized");

      // ✅ Abrir modal (sin esperar a que el usuario haga requests)
      openLoginDialog("expired");

      // IMPORTANTE:
      // - NO tocamos lastUserIdRef aquí.
      //   Así, cuando se loguee otro usuario, detectamos el cambio y lo mandamos a "/".
    } finally {
      probeInFlightRef.current = false;
    }
  }, [closeLoginDialog, openLoginDialog, router]);

  // ---------------------------------------
  // ✅ Programar probe EXACTO al cumplirse el idle
  // ---------------------------------------
  const scheduleIdleProbe = useCallback(() => {
    // ✅ Si no hay sesión, no programes probes por idle (evita molestar en landing)
    if (!isAuthenticated) return;

    if (idleProbeTimerRef.current) {
      clearTimeout(idleProbeTimerRef.current);
      idleProbeTimerRef.current = null;
    }

    idleProbeTimerRef.current = setTimeout(() => {
      // ✅ Se cumplió el idle -> preguntamos al backend
      probeBackendSession();
    }, IDLE_MS);
  }, [IDLE_MS, isAuthenticated, probeBackendSession]);

  // ---------------------------------------
  // ✅ Listener global de interacción
  // ---------------------------------------
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    let ticking = false;

    const onAny = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;

        // ✅ Actualiza interacción
        lastInteractionRef.current = Date.now();

        // ✅ Reprograma el probe “idle”
        scheduleIdleProbe();
      });
    };

    events.forEach((e) => window.addEventListener(e, onAny, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, onAny as any));
      if (idleProbeTimerRef.current) clearTimeout(idleProbeTimerRef.current);
    };
  }, [scheduleIdleProbe]);

  // ---------------------------------------
  // ✅ Probe al volver a foco / volver a la pestaña
  // ---------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    const onFocus = () => probeBackendSession();
    const onVisibility = () => {
      if (document.visibilityState === "visible") probeBackendSession();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, probeBackendSession]);

  // ---------------------------------------
  // ✅ Probe periódico: detecta expiración del backend sin esperar idle UI
  // ---------------------------------------
  useEffect(() => {
    if (periodicProbeRef.current) {
      clearInterval(periodicProbeRef.current);
      periodicProbeRef.current = null;
    }

    if (!isAuthenticated) return;

    periodicProbeRef.current = setInterval(() => {
      // ✅ Solo si tab visible (reduce ruido)
      if (document.visibilityState !== "visible") return;
      // ✅ Evita probes concurrentes
      if (probeInFlightRef.current) return;

      probeBackendSession();
    }, PROBE_EVERY_MS);

    return () => {
      if (periodicProbeRef.current) clearInterval(periodicProbeRef.current);
      periodicProbeRef.current = null;
    };
  }, [isAuthenticated, probeBackendSession]);

  // ---------------------------------------
  // ✅ Fetch inicial (al montar / revalidate)
  // ---------------------------------------
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      /**
       * ✅ CLAVE: load inicial “silencioso”
       * - Si estás en "/" sin sesión, NO queremos que se abra el modal.
       * - Esto evita que apiFetch dispare auth:login-required en el primer render.
       */
      const u = (await getProfileSilent()) as AuthUser;

      const newId = u?.id ?? null;
      const oldId = lastUserIdRef.current;

      setUser(u);
      setIsAuthenticated(true);

      // ✅ Si cambió el usuario, mandar a "/"
      if (oldId !== null && newId !== null && oldId !== newId) {
        router.push("/");
        router.refresh();
      }

      lastUserIdRef.current = newId;

      const initialNotifications = await getNotifications();
      setNotifications(initialNotifications);

      // ✅ Programar idle probe desde ahora
      lastInteractionRef.current = Date.now();
      scheduleIdleProbe();

      // ✅ Si estaba abierto, cerrar modal
      closeLoginDialog();
    } catch (err: any) {
      setUser(null);
      setIsAuthenticated(false);
      setNotifications([]);
      setError(err?.message || "Unauthorized");
      // ✅ Aquí NO abrimos modal: landing debe poder verse sin sesión.
    } finally {
      setIsLoading(false);
    }
  }, [fetchCount, closeLoginDialog, router, scheduleIdleProbe]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ---------------------------------------
  // ✅ Socket notifications
  // ---------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const socket: Socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("new_notification", (newNotification: Notification) => {
      toast.info(newNotification.message);
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const revalidate = () => setFetchCount((p) => p + 1);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    error,
    setUser,
    revalidate,
    notifications,
    unreadCount,
    setNotifications,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
