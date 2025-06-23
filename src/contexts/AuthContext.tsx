// src/contexts/AuthContext.tsx
"use client";

import { AuthUser } from '@/app/types/auth';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';


interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  // Función para establecer el usuario directamente después del login
  // O cuando ya tienes los datos y quieres actualizar el contexto
  setUser: (user: AuthUser | null) => void;
  // Función para forzar una revalidación (útil para logout o errores)
  revalidate: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0); // Para forzar revalidación

  // La lógica de fetching se encapsula aquí
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/me'); // Llama a tu API Route
      if (!response.ok) {
        if (response.status === 401) {
          // Si no está autenticado, simplemente limpiamos el estado
          setUser(null);
          setIsAuthenticated(false);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al obtener datos del usuario.');
        }
      } else {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(data.isAuthenticated);
      }
    } catch (err: any) {
      console.error("Error en AuthProvider al obtener datos del usuario:", err);
      setUser(null);
      setIsAuthenticated(false);
      setError(err.message || 'Error de conexión al verificar autenticación.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCount]); // Dependencia en fetchCount para revalidar

  useEffect(() => {
    fetchUser();
  }, [fetchUser]); // Se ejecuta al montar el componente y cada vez que fetchUser cambia (por fetchCount)

  // Función para que los componentes puedan forzar una revalidación
  const revalidate = () => {
    setFetchCount(prev => prev + 1);
  };

  const contextValue = {
    isAuthenticated,
    user,
    isLoading,
    error,
    setUser, // Exponemos la función setUser
    revalidate, // Exponemos la función revalidate
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para consumir el contexto
export const useAuth = () => { // Renombramos de useAuthContext a useAuth para consistencia
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log("este es el contexto");
  
  console.log(context);
  
  return context;
};