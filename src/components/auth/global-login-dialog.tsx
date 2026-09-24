"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { CardLogin } from "@/components/card-login";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { usePathname, useRouter } from "next/navigation";

export function GlobalLoginDialog() {
  const router = useRouter();
  const pathname = usePathname();

  const { isLoginDialogOpen, setIsLoginDialogOpen, closeLoginDialog, reason } =
    useLoginDialog();

  const isExpired = reason === "expired";

  const handleLoginSuccess = () => {
    // Siempre cerramos el modal
    closeLoginDialog();

    // Solo en login "manual" mandamos a "/"
    if (!isExpired) {
      router.push("/");
    }

    // En expired: NO hacemos nada más (sin refresh, sin navegación)
  };

  const handleClose = () => {
    // Solo permitimos cerrar manualmente en modo manual
    if (!isExpired) closeLoginDialog();
  };

  // El portal técnico tiene su propio acceso, sin registro público ni área comercial.
  if (pathname === "/technician" || pathname.startsWith("/technician/")) return null;

  // La información comercial y sus políticas siguen accesibles con una sesión vencida.
  if (pathname === "/company" || pathname === "/sms" || pathname.startsWith("/sms/") ||
      pathname === "/terms" || pathname.startsWith("/terms/")) return null;

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
        className="border-red-600/70 bg-black/80 p-0 text-white shadow-[0_0_60px_rgba(220,38,38,0.22)] backdrop-blur-xl sm:max-w-[460px]"
        onEscapeKeyDown={(e) => {
          if (isExpired) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isExpired) e.preventDefault();
        }}
        showCloseButton={!isExpired}
      >
        <DialogTitle className="sr-only">
          {isExpired ? "Session expired" : "Sign in"}
        </DialogTitle>

        <CardLogin
          onLoginSuccess={handleLoginSuccess}
          onClose={handleClose}
          mode={isExpired ? "unlock" : "full"}
          appearance="dark"
        />
      </DialogContent>
    </Dialog>
  );
}
