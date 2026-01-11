// src/app/profile/profile-client.tsx
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
import type { User } from "@/lib/types";
import type { AuthUser } from "@/app/types/auth";
import { toast } from "sonner";
import { getProfile } from "@/app/api/auth/me/auth.api";

export function ProfileClient({
  initialAuthUser,
}: {
  initialAuthUser: AuthUser;
}) {
  const router = useRouter();
  const { setUser } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ 1) Sincroniza contexto global inmediatamente con el AuthUser del server
  // (evita estados raros en navbar/guards mientras se carga el profile completo)
  useEffect(() => {
    setUser(initialAuthUser as unknown as User);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAuthUser.id]);

  // ✅ 2) Trae el perfil completo (street/city/state/etc)
  // y preserva el role del initialAuthUser.
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const fullUserData = await getProfile();

        const completeUser: User = {
          ...fullUserData,
          role: (fullUserData as any)?.role ?? (initialAuthUser.role as any),
        };

        setProfileUser(completeUser);
        setUser(completeUser);
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast.error("Could not load profile data.");
        setProfileUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAuthUser.id]);

  // ✅ 3) TU lógica (correcta): mantener role aunque la API devuelva user sin role completo
  const handleProfileUpdate = (updatedUserFromApi: User) => {
    const roleToKeep = profileUser?.role ?? (initialAuthUser.role as any);

    if (!roleToKeep) {
      toast.error("An error occurred while updating. Please reload the page.");
      return;
    }

    const completeUpdatedUser: User = {
      ...updatedUserFromApi,
      role: roleToKeep,
    };

    setProfileUser(completeUpdatedUser);
    setUser(completeUpdatedUser);
  };

  if (isLoading) {
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

            <Button
              variant="outline"
              onClick={() => router.push("/profile/change-password")}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
