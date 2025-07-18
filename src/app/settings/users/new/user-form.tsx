"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CreateUserDto, UpdateUserDto, Role, User } from "@/app/api/types";
import { createUser, updateUser, updateMyProfile } from "@/app/api/users.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFormProps {
  user?: User;
  roles: Role[];
  onProfileUpdate?: (updatedUser: User) => void;
}

type UserFormData = Omit<CreateUserDto, "password"> & { password?: string };

export function UserForm({ user, roles, onProfileUpdate }: UserFormProps) {
  const router = useRouter();
  const isEditMode = !!user;
  const isProfilePage = isEditMode && roles.length === 1;
  const isRoleChangeMode = isEditMode && !isProfilePage;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      username: user?.username || "",
      idRole: user?.idRole || roles.find((r) => r.name === "client")?.id,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEditMode) {
        if (isProfilePage) {
          const updateData: Omit<UpdateUserDto, "password" | "idRole"> = data;
          const updatedUser = await updateMyProfile(updateData);
          toast.success("Perfil actualizado correctamente!");
          reset(updatedUser);
          if (onProfileUpdate) {
            onProfileUpdate(updatedUser);
          }
        } else {
          const updateData: Partial<UpdateUserDto> = {
            idRole: Number(data.idRole),
          };
          await updateUser(user.id, updateData);
          toast.success("Rol de usuario actualizado correctamente!");
        }
      } else {
        // Lógica para crear un nuevo usuario
        if (!data.password) {
          throw new Error("La contraseña es requerida para crear un nuevo usuario.");
        }

        // ✅ *** CORRECCIÓN APLICADA AQUÍ ***
        // Se crea un nuevo payload para asegurar que idRole sea un número.
        const payload = {
          ...data,
          idRole: Number(data.idRole),
        };
        
        await createUser(payload as CreateUserDto);
        toast.success("Usuario creado exitosamente!");
      }

      // Redirige solo si es un admin creando o editando
      if (!isProfilePage) {
        router.push("/settings/users");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Falló al guardar los cambios.");
    }
  });

  const showLoadingState = isSubmitting;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" {...register("firstName")} disabled={isRoleChangeMode} />
        </div>
        <div>
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" {...register("lastName")} disabled={isRoleChangeMode} />
        </div>
        <div>
          <Label htmlFor="username">Usuario</Label>
          <Input id="username" {...register("username")} disabled={isRoleChangeMode} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} disabled={isRoleChangeMode} />
        </div>
        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" type="tel" {...register("phone")} disabled={isRoleChangeMode} />
        </div>
        <div>
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" {...register("address")} disabled={isRoleChangeMode} />
        </div>
        
        {!isEditMode && (
          <div className="md:col-span-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" {...register("password", { required: "La contraseña es requerida" })} />
            {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
          </div>
        )}

        {!isProfilePage && (
          <div>
            <Label htmlFor="idRole">Rol</Label>
            <Controller
              name="idRole"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={String(field.value)}
                >
                  <SelectTrigger id="idRole">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={showLoadingState} >
          Cancelar
        </Button>
        <Button type="submit" disabled={!isDirty || showLoadingState}>
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState ? "Guardando..." : isProfilePage ? "Actualizar Perfil" : isEditMode ? "Cambiar Rol" : "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}
