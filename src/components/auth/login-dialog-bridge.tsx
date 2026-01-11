'use client';

import { useEffect } from 'react';
import { useLoginDialog } from '@/contexts/LoginDialogContext';

export function LoginDialogBridge() {
  const { openLoginDialog } = useLoginDialog();

  useEffect(() => {
    const onLoginRequired = () => openLoginDialog('expired');

    window.addEventListener('auth:login-required', onLoginRequired);
    return () => window.removeEventListener('auth:login-required', onLoginRequired);
  }, [openLoginDialog]);

  return null;
}
