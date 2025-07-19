'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Definimos el tipo para el contexto
interface LoginDialogContextType {
  isLoginDialogOpen: boolean;
  setIsLoginDialogOpen: (isOpen: boolean) => void;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
}

// Creamos el contexto con un valor por defecto (que nunca se usará directamente si el Provider está bien configurado)
const LoginDialogContext = createContext<LoginDialogContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export function useLoginDialog() {
  const context = useContext(LoginDialogContext);
  if (context === undefined) {
    throw new Error('useLoginDialog must be used within a LoginDialogProvider');
  }
  return context;
}

// Componente Provider para envolver la aplicación o partes de ella
interface LoginDialogProviderProps {
  children: ReactNode;
}

export function LoginDialogProvider({ children }: LoginDialogProviderProps) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const openLoginDialog = () => setIsLoginDialogOpen(true);
  const closeLoginDialog = () => setIsLoginDialogOpen(false);

  const value = {
    isLoginDialogOpen,
    setIsLoginDialogOpen,
    openLoginDialog,
    closeLoginDialog,
  };

  return (
    <LoginDialogContext.Provider value={value}>
      {children}
    </LoginDialogContext.Provider>
  );
}
