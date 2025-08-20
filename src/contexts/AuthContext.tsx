"use client";

import { AuthUser } from '@/app/types/auth';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Notification } from '@/app/api/types';
import { getNotifications } from '@/app/api/notifications.api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  revalidate: () => void;
  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(data.isAuthenticated);
        if (data.isAuthenticated) {
          const initialNotifications = await getNotifications();
          setNotifications(initialNotifications);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      console.error("Error en AuthProvider al obtener datos del usuario:", err);
      setUser(null);
      setIsAuthenticated(false);
      setError(err.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCount]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
        query: { userId: user.id },
      });

      socket.on('connect', () => console.log('[WS] Connected to server!'));

      socket.on('new_notification', (newNotification: Notification) => {
        toast.info(newNotification.message);
        setNotifications(prev => [newNotification, ...prev]);
      });

      return () => {
        socket.disconnect();
        console.log('[WS] Disconnected from server.');
      };
    }
  }, [isAuthenticated, user]);

  const revalidate = () => setFetchCount(p => p + 1);

  const contextValue = {
    isAuthenticated,
    user,
    isLoading,
    error,
    setUser,
    revalidate,
    notifications,
    unreadCount,
    setNotifications,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};