"use client";

import { AuthProvider } from "@/contexts/AuthContext"; // Asegúrate de que esta ruta sea correcta
import { LoginDialogProvider } from "@/contexts/LoginDialogContext"; // Importa el nuevo proveedor de contexto
import { CompanyBrandingProvider } from "@/contexts/CompanyBrandingContext";
import React, { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const preventNumberWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;

      const input = event.target;
      if (
        input instanceof HTMLInputElement &&
        input.type === "number" &&
        input === document.activeElement &&
        !input.disabled &&
        !input.readOnly
      ) {
        // Salir del campo evita el cambio nativo por rueda y conserva el scroll.
        // Las flechas por clic y la escritura mantienen su comportamiento.
        input.blur();
      }
    };

    // La captura cubre también inputs nativos y formularios dentro de portales.
    document.addEventListener("wheel", preventNumberWheel, { capture: true, passive: true });
    return () => document.removeEventListener("wheel", preventNumberWheel, true);
  }, []);

  return (
    // Envuelve los children con ambos proveedores
    <CompanyBrandingProvider>
      <LoginDialogProvider>
        <AuthProvider>{children}</AuthProvider>
      </LoginDialogProvider>
    </CompanyBrandingProvider>
  );
}
