"use client";

import { useEffect, useRef } from "react";
import { useLoginDialog } from "@/contexts/LoginDialogContext";

export function LoginDialogBridge() {
  const { openLoginDialog } = useLoginDialog();
  const suppressExpiredRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onManualLogout = () => {
      // comentario en español: evita mostrar "Session expired" durante logout manual
      suppressExpiredRef.current = true;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        suppressExpiredRef.current = false;
      }, 3000);
    };

    const onLoginRequired = () => {
      if (suppressExpiredRef.current) return;

      openLoginDialog("expired");
    };

    window.addEventListener("auth:manual-logout", onManualLogout);
    window.addEventListener("auth:login-required", onLoginRequired);

    return () => {
      window.removeEventListener("auth:manual-logout", onManualLogout);
      window.removeEventListener("auth:login-required", onLoginRequired);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [openLoginDialog]);

  return null;
}
