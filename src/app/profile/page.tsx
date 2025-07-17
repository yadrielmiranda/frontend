"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserForm } from "@/app/settings/users/new/user-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";
import { getUser } from "@/app/api/users.api";
import { User} from "@/app/api/types";
import { AuthUser } from "../types/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading, setUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authUser?.id) {
      const fetchUserProfile = async () => {
        try {
          const fullUserData = await getUser(Number(authUser.id));
          setProfileUser(fullUserData);
        } catch (error) {
          console.error("Error al cargar los datos del perfil:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [authUser]);

  const handleProfileUpdate = (updatedUser: User) => {
    // Actualiza el estado local de esta página
    setProfileUser(updatedUser);

    // Crea un objeto que coincida con el tipo AuthUser para el contexto
    const userForContext: AuthUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    // Actualiza el estado global para que toda la app vea el cambio
    setUser(userForContext);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex justify-center items-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profileUser || !profileUser.role) {
    return (
      <p className="text-center pt-20">
        No se pudieron cargar los datos del perfil. Por favor, intenta de nuevo.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4">
      {/* Tarjeta para la Información del Perfil */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Mi Perfil</CardTitle>
          <CardDescription>
            Actualiza tu información personal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            user={profileUser}
            roles={[profileUser.role]}
            onProfileUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      {/* Tarjeta para la Seguridad y Contraseña */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Seguridad</CardTitle>
          <CardDescription>
            Gestiona la seguridad de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Contraseña</p>
              <p className="text-sm text-muted-foreground">
                Se recomienda cambiar tu contraseña periódicamente.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/profile/change-password')}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Cambiar contraseña
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
