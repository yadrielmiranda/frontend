"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Se importan los tipos desde el archivo central
import { CreateUserDto, UpdateUserDto, Role, User } from "@/app/api/types";
import { createUser, updateUser } from "@/app/api/users.api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// El formulario ahora espera recibir los roles disponibles y opcionalmente un usuario
interface UserFormProps {
  user?: User;
  roles: Role[];
}

// Se usa un tipo derivado para el formulario, para que la contraseña sea opcional
type UserFormData = Omit<CreateUserDto, 'password'> & {
  password?: string;
};

export function UserForm({ user, roles }: UserFormProps) {
  const router = useRouter();
  const isEditMode = !!user;

  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UserFormData>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      username: user?.username || "",
      password: "",
      // El valor por defecto ahora es el ID del rol
      idRole: user?.idRole || roles.find(r => r.name === 'client')?.id,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    // Aseguramos que idRole sea un número antes de enviarlo
    const userData = {
      ...data,
      idRole: Number(data.idRole),
    };

    try {
      if (isEditMode) {
        const updateData: UpdateUserDto = userData;
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateUser(user.id, updateData);
        toast.success("User updated successfully!");
      } else {
        if (!userData.password) {
          throw new Error("Password is required for new users.");
        }
        await createUser(userData as CreateUserDto);
        toast.success("User created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/users");
      
    } catch (err: any) {
      toast.error(err.message || "Failed to save user.");
    }
  });

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register("firstName", { required: "First name is required" })} />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...register("lastName", { required: "Last name is required" })} />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" {...register("username", { required: "Username is required" })} />
          {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email", { required: "Email is required" })} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" {...register("phone", { required: "Phone number is required" })} />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address", { required: "Address is required" })} />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} placeholder={isEditMode ? "Leave blank to keep current password" : "Enter password"} />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
            <Label htmlFor="idRole">Role</Label>
            <Controller
                name="idRole"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                        <SelectTrigger id="idRole">
                            <SelectValue placeholder="Select a role" />
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
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={showLoadingState}>
          Cancel
        </Button>
        <Button type="submit" variant={isEditMode ? "blue" : "green"} disabled={!isDirty || showLoadingState}>
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState ? "Saving..." : (isEditMode ? "Update User" : "Create User")}
        </Button>
      </div>
    </form>
  );
}
