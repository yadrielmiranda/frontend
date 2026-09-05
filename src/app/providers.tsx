"use client";

import { AuthProvider } from "@/contexts/AuthContext"; // Asegúrate de que esta ruta sea correcta
import { LoginDialogProvider } from "@/contexts/LoginDialogContext"; // Importa el nuevo proveedor de contexto
import { CompanyBrandingProvider } from "@/contexts/CompanyBrandingContext";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Envuelve los children con ambos proveedores
    <CompanyBrandingProvider>
      <LoginDialogProvider>
        <AuthProvider>{children}</AuthProvider>
      </LoginDialogProvider>
    </CompanyBrandingProvider>
  );
}
