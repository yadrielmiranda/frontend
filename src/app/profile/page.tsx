"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserForm } from "@/app/settings/(write)/users/new/user-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";
import { User } from "@/app/api/types";
import { toast } from "sonner";
import { getProfile } from "@/app/api/auth/me/auth.api";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading, setUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    
    if (authUser?.id) {
      const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
          const fullUserData = await getProfile();
          setProfileUser(fullUserData);
        } catch (error) {
          console.error("Error al cargar los datos del perfil:", error);
          toast.error("Could not load profile data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [authUser, isAuthLoading]);

  // ✅ Esta es TU lógica original, que es la correcta.
  const handleProfileUpdate = (updatedUserFromApi: User) => {
    // Valida que tengamos el rol del usuario actual antes de continuar.
    if (!profileUser?.role) {
      toast.error("An error occurred while updating. Please reload the page.");
      return;
    }

    // Combina los datos actualizados de la API con el rol que ya teníamos.
    const completeUpdatedUser: User = {
      ...updatedUserFromApi,
      role: profileUser.role, // Reutilizamos el rol del estado local.
    };

    // Actualiza el estado local de esta página.
    setProfileUser(completeUpdatedUser);

    // Actualiza el contexto global con el objeto completo para que toda la app lo vea.
    setUser(completeUpdatedUser);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex justify-center items-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <p className="text-center pt-20">
        Could not load profile data. Please log in and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            user={profileUser}
            roles={[profileUser.role]}
            onProfileUpdate={handleProfileUpdate}
          />
        </CardContent>
      </Card>

      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Security</CardTitle>
          <CardDescription>Manage your account security.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                It is recommended to change your password periodically.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/profile/change-password')}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
