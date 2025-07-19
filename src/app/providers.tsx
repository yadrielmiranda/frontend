'use client';

import { AuthProvider } from '@/contexts/AuthContext'; // Asegúrate de que esta ruta sea correcta
import { LoginDialogProvider } from '@/contexts/LoginDialogContext'; // Importa el nuevo proveedor de contexto
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Envuelve los children con ambos proveedores
    <AuthProvider>
      <LoginDialogProvider>
        {children}
      </LoginDialogProvider>
    </AuthProvider>
  );
}
