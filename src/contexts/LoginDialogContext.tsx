'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

type LoginReason = 'manual' | 'expired';

interface LoginDialogContextType {
  isLoginDialogOpen: boolean;
  setIsLoginDialogOpen: (isOpen: boolean) => void;

  reason: LoginReason;
  openLoginDialog: (reason?: LoginReason) => void;
  closeLoginDialog: () => void;
  toggleLoginDialog: () => void;

  requestRetry: () => void;
  consumeRetryRequested: () => boolean;
}

const LoginDialogContext = createContext<LoginDialogContextType | undefined>(
  undefined
);
LoginDialogContext.displayName = 'LoginDialogContext';

export function useLoginDialog() {
  const ctx = useContext(LoginDialogContext);
  if (!ctx)
    throw new Error('useLoginDialog must be used within a LoginDialogProvider');
  return ctx;
}

interface LoginDialogProviderProps {
  children: ReactNode;
  initialOpen?: boolean;
}

export function LoginDialogProvider({
  children,
  initialOpen = false,
}: LoginDialogProviderProps) {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(initialOpen);
  const [reason, setReason] = useState<LoginReason>('manual');

  const [retryRequested, setRetryRequested] = useState(false);

  const openLoginDialog = useCallback((r: LoginReason = 'manual') => {
    setReason(r);
    setIsLoginDialogOpen(true);
  }, []);

  const closeLoginDialog = useCallback(() => setIsLoginDialogOpen(false), []);
  const toggleLoginDialog = useCallback(() => setIsLoginDialogOpen((v) => !v), []);

  const requestRetry = useCallback(() => setRetryRequested(true), []);
  const consumeRetryRequested = useCallback(() => {
    const v = retryRequested;
    if (v) setRetryRequested(false);
    return v;
  }, [retryRequested]);

  const value = useMemo(
    () => ({
      isLoginDialogOpen,
      setIsLoginDialogOpen,
      reason,
      openLoginDialog,
      closeLoginDialog,
      toggleLoginDialog,
      requestRetry,
      consumeRetryRequested,
    }),
    [
      isLoginDialogOpen,
      reason,
      openLoginDialog,
      closeLoginDialog,
      toggleLoginDialog,
      requestRetry,
      consumeRetryRequested,
    ]
  );

  return (
    <LoginDialogContext.Provider value={value}>
      {children}
    </LoginDialogContext.Provider>
  );
}
