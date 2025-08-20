"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "./delete-conf-dialog";
import { deleteAllNotifications, deleteNotification, markNotificationAsRead } from "@/app/api/notifications.api";
import { toast } from "sonner";

export function NotificationBell() {
  const { notifications, unreadCount, setNotifications } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleMarkAsRead = async (id: number) => {
    const notification = notifications.find(n => n.id === id);
    if (notification?.isRead) return;

    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
        toast.error("Could not mark as read.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error("Could not delete the notification.");
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await deleteAllNotifications();
      setNotifications([]);
      toast.success(`${result.count} notifications cleared.`);
    } catch (error) {
      toast.error("Could not clear notifications.");
    } finally {
      setShowConfirmDialog(false); // Cierra el diálogo sin importar el resultado
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-[-5px] right-[-5px] flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length > 0 ? (
            <>
              {notifications.map((notification) => (
                <DropdownMenuItem 
                    key={notification.id} 
                    className={`flex items-start gap-2 cursor-pointer ${!notification.isRead ? 'font-bold' : ''}`}
                    onSelect={(e) => { e.preventDefault(); handleMarkAsRead(notification.id); }}
                >
                    <div className="flex-grow">
                        <p className="text-sm whitespace-normal">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                        title="Delete notification"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={(e) => { e.preventDefault(); setShowConfirmDialog(true); }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All Notifications</span>
              </DropdownMenuItem>
            </>
          ) : (
            <p className="p-4 text-sm text-center text-muted-foreground">No notifications.</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleClearAll}
        itemName="all your notifications"
      />
    </>
  );
}