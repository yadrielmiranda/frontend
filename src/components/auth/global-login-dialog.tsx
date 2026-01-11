'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { CardLogin } from '@/components/card-login';
import { useLoginDialog } from '@/contexts/LoginDialogContext';
import { useRouter } from 'next/navigation';

export function GlobalLoginDialog() {
  const router = useRouter();

  const {
    isLoginDialogOpen,
    setIsLoginDialogOpen,
    closeLoginDialog,
    reason,
  } = useLoginDialog();

  const isExpired = reason === 'expired';

  const handleLoginSuccess = () => {
    // ✅ Siempre cerramos el modal
    closeLoginDialog();

    // ✅ Solo en login "manual" mandamos a "/"
    if (!isExpired) {
      router.push('/');
    }

    // ✅ En expired: NO hacemos nada más (sin refresh, sin navegación)
  };

  const handleClose = () => {
    // Solo permitimos cerrar manualmente en modo manual
    if (!isExpired) closeLoginDialog();
  };

  return (
    <Dialog
      open={isLoginDialogOpen}
      onOpenChange={(open) => {
        // ✅ En expired NO dejamos cerrar el modal (ni click fuera, ni ESC)
        if (isExpired) return;
        setIsLoginDialogOpen(open);
      }}
      modal
    >
      <DialogContent
        className="sm:max-w-[425px]"
        onEscapeKeyDown={(e) => {
          if (isExpired) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isExpired) e.preventDefault();
        }}
        showCloseButton={!isExpired}
      >
        <DialogHeader>
          <DialogTitle>{isExpired ? 'Session expired' : 'Sign in'}</DialogTitle>
          <DialogDescription>
            {isExpired
              ? 'Your session expired due to inactivity. Please sign in again to continue.'
              : 'Use your username or email to access your account.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <CardLogin
            onLoginSuccess={handleLoginSuccess}
            onClose={handleClose}
            mode={isExpired ? 'unlock' : 'full'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
