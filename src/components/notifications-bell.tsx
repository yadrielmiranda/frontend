"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyLocale } from "@/components/company/company-content";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "./delete-conf-dialog";
import {
  deleteAllNotifications,
  deleteNotification,
  markNotificationAsRead,
} from "@/app/api/notifications.api";
import { toast } from "sonner";

const notificationCopy = {
  en: {
    title: "Notifications",
    open: "Open",
    remove: "Delete notification",
    clear: "Clear All Notifications",
    empty: "No notifications.",
    markReadError: "Could not mark as read.",
    deleted: "Notification deleted.",
    deleteError: "Could not delete the notification.",
    cleared: (count: number) => `${count} ${count === 1 ? "notification" : "notifications"} cleared.`,
    clearError: "Could not clear notifications.",
    clearTitle: "Are you absolutely sure?",
    clearDescription: "This action cannot be undone. This will permanently delete all your notifications.",
    cancel: "Cancel",
    confirm: "Confirm",
  },
  es: {
    title: "Notificaciones",
    open: "Abrir",
    remove: "Eliminar notificación",
    clear: "Eliminar todas las notificaciones",
    empty: "No tienes notificaciones.",
    markReadError: "No se pudo marcar la notificación como leída.",
    deleted: "Notificación eliminada.",
    deleteError: "No se pudo eliminar la notificación.",
    cleared: (count: number) => count === 1 ? "Se eliminó 1 notificación." : `Se eliminaron ${count} notificaciones.`,
    clearError: "No se pudieron eliminar las notificaciones.",
    clearTitle: "¿Eliminar todas las notificaciones?",
    clearDescription: "Se eliminarán permanentemente todas tus notificaciones.",
    cancel: "Cancelar",
    confirm: "Eliminar todas",
  },
};

export function NotificationBell({ locale = "en" }: { locale?: CompanyLocale } = {}) {
  const copy = notificationCopy[locale];
  const router = useRouter();
  const { notifications, unreadCount, setNotifications, refreshNotifications } =
    useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleMarkAsRead = async (id: number) => {
    const notification = notifications.find((n) => n.id === id);
    if (notification?.isRead) return;

    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      toast.error(copy.markReadError);
    }
  };

  const handleNotificationSelect = async (
    notification: (typeof notifications)[number],
  ) => {
    await handleMarkAsRead(notification.id);

    const actionUrl = notification.actionUrl;
    if (actionUrl?.startsWith("/") && !actionUrl.startsWith("//")) {
      router.push(actionUrl);
      // Actualiza los datos también cuando la notificación apunta a la vista abierta.
      router.refresh();
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(copy.deleted);
    } catch {
      toast.error(copy.deleteError);
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await deleteAllNotifications();
      setNotifications([]);
      toast.success(copy.cleared(result.count));
    } catch {
      toast.error(copy.clearError);
    } finally {
      setShowConfirmDialog(false); // Cierra el diálogo sin importar el resultado
    }
  };

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) void refreshNotifications();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
            aria-label={copy.title}
          >
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white ring-2 ring-slate-950">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80" lang={locale}>
          <DropdownMenuLabel>{copy.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length > 0 ? (
            <>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-2 cursor-pointer ${!notification.isRead ? "font-bold" : ""}`}
                  onSelect={() => void handleNotificationSelect(notification)}
                >
                  <div className="flex-grow">
                    <p className="text-sm whitespace-pre-line">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString(locale === "es" ? "es-US" : "en-US")}
                    </p>
                    {notification.actionUrl && (
                      <p className="mt-1 text-xs font-semibold text-primary">
                        {notification.actionLabel || copy.open} →
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                    title={copy.remove}
                    aria-label={copy.remove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={(e) => {
                  e.preventDefault();
                  setShowConfirmDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span>{copy.clear}</span>
              </DropdownMenuItem>
            </>
          ) : (
            <p className="p-4 text-sm text-center text-muted-foreground">
              {copy.empty}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleClearAll}
        title={copy.clearTitle}
        description={copy.clearDescription}
        cancelText={copy.cancel}
        confirmText={copy.confirm}
        lang={locale}
      />
    </>
  );
}
