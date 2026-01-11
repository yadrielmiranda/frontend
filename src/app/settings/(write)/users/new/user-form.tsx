"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { CreateUserDto, UpdateUserDto, Role, User } from "@/lib/types";
import { createUser, updateUser} from "@/app/api/users.api";
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
import { useEffect, useState } from "react";
import { isValidUSZip, normalizeUSZip } from "@/lib/validators-zip";
import { lookupZip } from "@/app/api/geo.api";
import { isValidEmail, normalizeEmail } from "@/lib/validators-email";
import { isValidUSPhone, normalizeUSPhoneToE164 } from "@/lib/validators-phone";
import { StateCombobox } from "@/components/StateCombobox";
import { updateMyProfile } from "@/app/api/auth/me/auth.api";

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
  const showRequiredMark = !isAdminEditMode; // create + profile => true, admin edit => false

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  const [hasOverride, setHasOverride] = useState(
    user?.markupOverride !== null && user?.markupOverride !== undefined
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      username: user?.username || "",

      street: user?.street || "",
      city: user?.city || "",
      state: user?.state || "",
      postalCode: user?.postalCode || "",
      idRole: user?.idRole || roles.find((r) => r.name === "client")?.id,
      markupOverride: user?.markupOverride
        ? String(Number((user.markupOverride * 100).toFixed(2)))
        : "",
      isTaxExempt: user?.isTaxExempt ?? false,
    },
  });

  const zip = useWatch({ control, name: "postalCode" });

  useEffect(() => {
    const zip5 = normalizeUSZip(zip);
    if (!isValidUSZip(zip5)) return;

    lookupZip(zip5)
      .then((res) => {
        if (!res) return;
        if (!watch("city")) setValue("city", res.city, { shouldDirty: true });
        if (!watch("state"))
          setValue("state", res.state, { shouldDirty: true });
      })
      .catch(() => {});
  }, [zip, setValue, watch]);

  const selectedRoleId = watch("idRole");
  const defaultMarkup =
    roles.find((r) => r.id === Number(selectedRoleId))?.markup || 0;

  const onSubmit = handleSubmit(async (data) => {
    try {
      // ✅ Normalizamos aquí (solo submit), no en register
      const normalizedPhone = normalizeUSPhoneToE164(data.phone);

      // Si phone es obligatorio en tu modelo, no dejes pasar null
      if (!normalizedPhone) {
        throw new Error("Invalid US phone number.");
      }

      if (isEditMode) {
        if (isProfilePage) {
          const updateData: Omit<
            UpdateUserDto,
            "password" | "idRole" | "markupOverride"
          > = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: normalizedPhone, // ✅ aquí
            street: data.street,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            username: data.username,
          };

          const updatedUser = await updateMyProfile(updateData);
          toast.success("Profile updated successfully!");

          const formValues: UserFormData = {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            street: updatedUser.street,
            city: updatedUser.city,
            state: updatedUser.state,
            postalCode: updatedUser.postalCode,
            username: updatedUser.username,
            idRole: updatedUser.idRole,
            markupOverride: updatedUser.markupOverride
              ? String(Number((updatedUser.markupOverride * 100).toFixed(2)))
              : "",
          };
          reset(formValues);

          onProfileUpdate?.(updatedUser);
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
            isTaxExempt: data.isTaxExempt ?? false,
            // NOTA: aquí NO estás permitiendo cambiar profile fields en admin edit (por tu diseño)
          };

          await updateUser(user.id, updateData);
          toast.success("User updated successfully!");
        }
      } else {
        if (!data.password) {
          throw new Error("Password is required to create a new user.");
        }

        const { markupOverride, ...rest } = data;

        const payload: CreateUserDto = {
          ...(rest as Omit<CreateUserDto, "idRole" | "phone">),
          idRole: Number(rest.idRole),
          phone: normalizedPhone, // ✅ aquí
          password: data.password,
        };

        await createUser(payload);
        toast.success("User created successfully!");
      }

      if (!isProfilePage) {
        router.push("/settings/users");        
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes.");
    }
  });

  const showLoadingState = isSubmitting;

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>First Name{showRequiredMark && <RequiredMark />}</Label>
          <Input
            {...register("firstName", { required: "First name is required" })}
            disabled={isAdminEditMode}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500 mt-1">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <Label>Last Name{showRequiredMark && <RequiredMark />}</Label>
          <Input
            {...register("lastName", { required: "Last name is required" })}
            disabled={isAdminEditMode}
          />
          {errors.lastName && (
            <p className="text-sm text-red-500 mt-1">
              {errors.lastName.message}
            </p>
          )}
        </div>

        <div>
          <Label>Username{showRequiredMark && <RequiredMark />}</Label>
          <Input
            {...register("username", {
              required: "Username is required",
              minLength: {
                value: 3,
                message: "Username must be at least 3 characters",
              },
            })}
            disabled={isAdminEditMode}
          />
          {errors.username && (
            <p className="text-sm text-red-500 mt-1">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <Label>Email{showRequiredMark && <RequiredMark />}</Label>
          <Input
            type="email"
            autoComplete="email"
            {...register("email", {
              required: "Email is required",
              setValueAs: (v) => normalizeEmail(v),
              validate: (v) => isValidEmail(v) || "Invalid email format",
            })}
            disabled={isAdminEditMode}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label>Phone{showRequiredMark && <RequiredMark />}</Label>
          <Input
            type="tel"
            autoComplete="tel"
            {...register("phone", {
              required: "Phone is required",
              validate: (v) => {
                if (!v) return "Phone is required";
                if (!isValidUSPhone(v)) return "Invalid US phone number";
                return true;
              },
            })}
            disabled={isAdminEditMode}
          />

          {errors.phone && (
            <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label>Street{showRequiredMark && <RequiredMark />}</Label>
          <Input
            {...register("street", { required: "Street is required" })}
            disabled={isAdminEditMode}
            autoComplete="address-line1"
          />
          {errors.street && (
            <p className="text-sm text-red-500 mt-1">{errors.street.message}</p>
          )}
        </div>

        <div>
          <Label>City{showRequiredMark && <RequiredMark />}</Label>
          <Input
            {...register("city", { required: "City is required" })}
            disabled={isAdminEditMode}
            autoComplete="address-level2"
          />
          {errors.city && (
            <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <StateCombobox
            control={control}
            name="state"
            label={showRequiredMark ? "State *" : "State"}
            placeholder="Select state…"
            disabled={isAdminEditMode}
            error={errors?.state?.message as string | undefined}
          />
        </div>

        <div>
          <Label>ZIP Code{showRequiredMark && <RequiredMark />}</Label>
          <Input
            autoComplete="postal-code"
            {...register("postalCode", {
              required: "ZIP is required",
              setValueAs: (v) => normalizeUSZip(v),
              validate: (v) => isValidUSZip(v) || "Invalid ZIP (5 digits)",
            })}
            disabled={isAdminEditMode}
          />
          {errors.postalCode && (
            <p className="text-sm text-red-500 mt-1">
              {errors.postalCode.message}
            </p>
          )}
        </div>

        {!isEditMode && (
          <div className="md:col-span-2">
            <Label htmlFor="password">
              Password
              <RequiredMark />
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: "Password is required",
              })}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
        )}

        {!isProfilePage && (
          <div>
            <Label htmlFor="idRole">Role</Label>
            <Controller
              name="idRole"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={String(field.value)}
                >
                  <SelectTrigger id="idRole">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem
                        key={role.id}
                        value={String(role.id)}
                        className="capitalize"
                      >
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

      {isAdminEditMode && (
        <div className="space-y-4 rounded-lg border p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="override-switch"
                className="font-semibold text-base"
              >
                Custom Markup Override
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable to assign a specific markup different from the role's
                default.
              </p>
            </div>
            <Checkbox
              id="override-switch"
              checked={hasOverride}
              onCheckedChange={(checked) => setHasOverride(Boolean(checked))}
              className="h-5 w-5"
            />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-md border p-3 bg-white">
            <div>
              <Label htmlFor="isTaxExempt" className="font-semibold text-base">
                Tax Exempt
              </Label>
              <p className="text-sm text-muted-foreground">
                If enabled, this user will NOT be charged factory sales tax on
                estimates.
              </p>
            </div>

            <Controller
              name="isTaxExempt"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isTaxExempt"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  className="h-5 w-5"
                />
              )}
            />
          </div>

          {hasOverride && (
            <div>
              <Label htmlFor="markupOverride">Custom Markup (%)</Label>
              <Input
                id="markupOverride"
                type="number"
                step="0.01"
                {...register("markupOverride")}
                placeholder="Enter custom markup..."
              />
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-3">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">How Markup Works</p>
              <p className="text-blue-700">
                The user will use the markup from their assigned role (
                {`"${
                  roles.find((r) => r.id === Number(selectedRoleId))?.name
                }"`}
                , currently **{defaultMarkup * 100}%**). If you enable and set a
                custom markup, that value will be used instead.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={showLoadingState}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isDirty || showLoadingState}>
          {showLoadingState && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {showLoadingState
            ? "Saving..."
            : isProfilePage
            ? "Update Profile"
            : isEditMode
            ? "Save Changes"
            : "Create User"}
        </Button>
      </div>
    </form>
  );
}
