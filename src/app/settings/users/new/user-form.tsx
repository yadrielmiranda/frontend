"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface UserFormProps {
  user?: User;
  roles: Role[];
  onProfileUpdate?: (updatedUser: User) => void;
}

type UserFormData = Omit<CreateUserDto, "password"> & { 
  password?: string;
  markupOverride?: string;
};

export function UserForm({ user, roles, onProfileUpdate }: UserFormProps) {
  const router = useRouter();
  const isEditMode = !!user;
  const isProfilePage = isEditMode && roles.length === 1;
  const isAdminEditMode = isEditMode && !isProfilePage;

  const [hasOverride, setHasOverride] = useState(user?.markupOverride !== null && user?.markupOverride !== undefined);

  const {
    register,
    handleSubmit,
    control,
    watch,
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
      markupOverride: user?.markupOverride ? String(Number((user.markupOverride * 100).toFixed(2))) : "",
    },
  });
  
  const selectedRoleId = watch("idRole");
  const defaultMarkup = roles.find(r => r.id === Number(selectedRoleId))?.markup || 0;

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isEditMode) {
        if (isProfilePage) {
          // --- INICIO DE LA CORRECCIÓN ---
          // Construimos el objeto 'updateData' manualmente para asegurarnos de que solo
          // contenga los campos permitidos para la actualización del perfil.
          // Esto soluciona el error de TypeScript.
          const updateData: Omit<UpdateUserDto, "password" | "idRole" | "markupOverride"> = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            username: data.username,
          };
          // --- FIN DE LA CORRECCIÓN ---

          const updatedUser = await updateMyProfile(updateData);
          toast.success("Perfil actualizado correctamente!");
          
          const formValues: UserFormData = {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            address: updatedUser.address,
            username: updatedUser.username,
            idRole: updatedUser.idRole,
            markupOverride: updatedUser.markupOverride ? String(Number((updatedUser.markupOverride * 100).toFixed(2))) : "",
          };
          reset(formValues);

          if (onProfileUpdate) {
            onProfileUpdate(updatedUser);
          }
        } else {
          let markupValue: number | null = null;
          if (hasOverride) {
            const parsedValue = parseFloat(data.markupOverride || "");
            if (isNaN(parsedValue)) {
              throw new Error("Custom markup must be a valid number.");
            }
            markupValue = parsedValue / 100;
          }
          
          const updateData: UpdateUserDto = {
            idRole: Number(data.idRole),
            markupOverride: markupValue,
          };

          await updateUser(user.id, updateData);
          toast.success("Usuario actualizado correctamente!");
        }
      } else {
        if (!data.password) {
          throw new Error("La contraseña es requerida para crear un nuevo usuario.");
        }
        const payload = {
          ...data,
          idRole: Number(data.idRole),
        };
        await createUser(payload as CreateUserDto);
        toast.success("Usuario creado exitosamente!");
      }

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
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div><Label>Nombre</Label><Input {...register("firstName")} disabled={isAdminEditMode} /></div>
        <div><Label>Apellido</Label><Input {...register("lastName")} disabled={isAdminEditMode} /></div>
        <div><Label>Usuario</Label><Input {...register("username")} disabled={isAdminEditMode} /></div>
        <div><Label>Email</Label><Input type="email" {...register("email")} disabled={isAdminEditMode} /></div>
        <div><Label>Teléfono</Label><Input type="tel" {...register("phone")} disabled={isAdminEditMode} /></div>
        <div><Label>Dirección</Label><Input {...register("address")} disabled={isAdminEditMode} /></div>
        
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
            <Controller name="idRole" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                <SelectTrigger id="idRole"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                <SelectContent>{roles.map((role) => (<SelectItem key={role.id} value={String(role.id)} className="capitalize">{role.name}</SelectItem>))}</SelectContent>
              </Select>
            )} />
          </div>
        )}
      </div>

      {isAdminEditMode && (
        <div className="space-y-4 rounded-lg border p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="override-switch" className="font-semibold text-base">Custom Markup Override</Label>
              <p className="text-sm text-muted-foreground">Enable to assign a specific markup different from the role's default.</p>
            </div>
            <Checkbox
              id="override-switch"
              checked={hasOverride}
              onCheckedChange={(checked) => setHasOverride(Boolean(checked))}
              className="h-5 w-5"
            />
          </div>
          {hasOverride && (
            <div>
              <Label htmlFor="markupOverride">Custom Markup (%)</Label>
              <Input id="markupOverride" type="number" step="0.01" {...register("markupOverride")} placeholder={`Enter custom markup...`} />
            </div>
          )}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-3">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">How Markup Works</p>
              <p className="text-blue-700">
                The user will use the markup from their assigned role ({`"${roles.find(r => r.id === Number(selectedRoleId))?.name}"`}, currently **{defaultMarkup * 100}%**). 
                If you enable and set a custom markup, that value will be used instead.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={showLoadingState}>Cancel</Button>
        <Button type="submit" disabled={!isDirty || showLoadingState}>
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState ? "Saving..." : isProfilePage ? "Update Profile" : isEditMode ? "Save Changes" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
