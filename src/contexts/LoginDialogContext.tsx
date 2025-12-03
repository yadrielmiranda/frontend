'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

interface LoginDialogContextType {
  isLoginDialogOpen: boolean;
  setIsLoginDialogOpen: (isOpen: boolean) => void;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
  toggleLoginDialog: () => void;
}

const LoginDialogContext = createContext<LoginDialogContextType | undefined>(undefined);
LoginDialogContext.displayName = 'LoginDialogContext';

export function useLoginDialog() {
  const ctx = useContext(LoginDialogContext);
  if (!ctx) throw new Error('useLoginDialog must be used within a LoginDialogProvider');
  return ctx;
}

interface LoginDialogProviderProps {
  children: ReactNode;
  initialOpen?: boolean;
}

export function LoginDialogProvider({ children, initialOpen = false }: LoginDialogProviderProps) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(initialOpen);

  const openLoginDialog = useCallback(() => setIsLoginDialogOpen(true), []);
  const closeLoginDialog = useCallback(() => setIsLoginDialogOpen(false), []);
  const toggleLoginDialog = useCallback(
    () => setIsLoginDialogOpen((v) => !v),
    []
  );

  const value = useMemo(
    () => ({
      isLoginDialogOpen,
      setIsLoginDialogOpen,
      openLoginDialog,
      closeLoginDialog,
      toggleLoginDialog,
    }),
    [isLoginDialogOpen, openLoginDialog, closeLoginDialog, toggleLoginDialog]
  );

  return (
    <LoginDialogContext.Provider value={value}>
      {children}
    </LoginDialogContext.Provider>
  );
}
