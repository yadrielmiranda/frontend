"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import {
  CreateUserDto,
  UpdateUserDto,
  Role,
  User,
  InstallationPriceProfile,
} from "@/lib/types";
import { createUser, updateUser } from "@/app/api/users.api";
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
  profiles?: InstallationPriceProfile[];
  onProfileUpdate?: (updatedUser: User) => void;
}

type UserFormData = Omit<CreateUserDto, "password"> & {
  password?: string;
  markupOverride?: string;
};

const MARKUP_PERCENT_PATTERN = /^-?(?:\d{1,8}(?:\.\d{1,16})?|\.\d{1,16})$/;

function shiftDecimalString(value: string, places: number): string {
  const match = value.trim().match(/^(-?)(?:(\d+)(?:\.(\d+))?|\.(\d+))$/);

  if (!match) {
    throw new Error("Custom markup must be a valid decimal number.");
  }

  const isNegative = match[1] === "-";
  const whole = match[2] ?? "0";
  const fraction = match[3] ?? match[4] ?? "";

  let digits = `${whole}${fraction}`;
  let decimalIndex = whole.length + places;

  if (decimalIndex < 0) {
    digits = `${"0".repeat(-decimalIndex)}${digits}`;
    decimalIndex = 0;
  } else if (decimalIndex > digits.length) {
    digits = `${digits}${"0".repeat(decimalIndex - digits.length)}`;
  }

  const integerPart = (
    decimalIndex === 0 ? "0" : digits.slice(0, decimalIndex)
  ).replace(/^0+(?=\d)/, "");

  const fractionPart = digits.slice(decimalIndex).replace(/0+$/, "");

  const isZero = integerPart === "0" && fractionPart.length === 0;

  return `${isNegative && !isZero ? "-" : ""}${integerPart || "0"}${
    fractionPart ? `.${fractionPart}` : ""
  }`;
}

function storedMarkupToPercent(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";

  return shiftDecimalString(String(value), 2);
}

function percentToStoredMarkup(value: string): string {
  const normalized = value.trim();

  if (!MARKUP_PERCENT_PATTERN.test(normalized)) {
    throw new Error(
      "Custom markup must be a valid percentage with up to 16 decimal places.",
    );
  }

  return shiftDecimalString(normalized, -2);
}

function isGreaterThanNegativeHundred(value: string): boolean {
  const normalized = value.trim();

  if (!normalized.startsWith("-")) return true;

  const [whole = "0"] = normalized.slice(1).split(".");
  const normalizedWhole = (whole || "0").replace(/^0+(?=\d)/, "");

  if (normalizedWhole.length < 3) return true;
  if (normalizedWhole.length > 3) return false;

  return normalizedWhole < "100";
}

export function UserForm({
  user,
  roles,
  profiles = [],
  onProfileUpdate,
}: UserFormProps) {
  const router = useRouter();
  const isEditMode = !!user;
  const isProfilePage = isEditMode && roles.length === 1;
  const isAdminEditMode = isEditMode && !isProfilePage;
  const showRequiredMark = !isAdminEditMode; // create + profile => true, admin edit => false

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  const initialHasOverride =
    user?.markupOverride !== null && user?.markupOverride !== undefined;

  const [hasOverride, setHasOverride] = useState(initialHasOverride);

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
      installationPriceProfileId: user?.installationPriceProfileId ?? null,
      markupOverride: storedMarkupToPercent(user?.markupOverride),
      isTaxExempt: user?.isTaxExempt ?? false,
      dealerMode: user?.dealerMode ?? "EXTERNAL",
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
  const selectedRoleName = roles.find(
    (role) => role.id === Number(selectedRoleId),
  )?.name;
  const isDealerAccount = selectedRoleName === "dealer";
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
            markupOverride: storedMarkupToPercent(updatedUser.markupOverride),
          };
          reset(formValues);

          onProfileUpdate?.(updatedUser);
        } else {
          let markupValue: string | null = null;

          if (hasOverride) {
            const rawMarkup = data.markupOverride?.trim() ?? "";

            if (!MARKUP_PERCENT_PATTERN.test(rawMarkup)) {
              throw new Error(
                "Custom markup must be a valid percentage with up to 16 decimal places.",
              );
            }

            if (!isGreaterThanNegativeHundred(rawMarkup)) {
              throw new Error("Custom markup must be greater than -100%.");
            }

            markupValue = percentToStoredMarkup(rawMarkup);
          }

          const updateData: UpdateUserDto = {
            idRole: Number(data.idRole),
            markupOverride: markupValue,
            isTaxExempt: data.isTaxExempt ?? false,
            ...(isDealerAccount
              ? {
                  dealerMode: data.dealerMode,
                }
              : {}),
            installationPriceProfileId:
              data.installationPriceProfileId == null
                ? null
                : Number(data.installationPriceProfileId),
            // NOTA: aquí NO estás permitiendo cambiar profile fields en admin edit (por tu diseño)
          };

          await updateUser(user.id, updateData);
          toast.success("User updated successfully!");
        }
      } else {
        if (!data.password) {
          throw new Error("Password is required to create a new user.");
        }

        const payload: CreateUserDto = {
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: normalizedPhone, // ✅ aquí
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          password: data.password,
          idRole: Number(data.idRole),
          isTaxExempt: data.isTaxExempt,
          installationPriceProfileId: data.installationPriceProfileId,
          ...(isDealerAccount
            ? {
                dealerMode: data.dealerMode,
              }
            : {}),
        };

        await createUser(payload);
        toast.success("User created successfully!");
      }

      if (!isProfilePage) {
        router.push("/settings/users");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save changes.",
      );
    }
  });

  const showLoadingState = isSubmitting;
  const hasUnsavedChanges =
    isDirty || (isAdminEditMode && hasOverride !== initialHasOverride);

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

        {!isProfilePage && isDealerAccount && (
          <div>
            <Label htmlFor="dealerMode">Dealer Mode</Label>
            <Controller
              name="dealerMode"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "EXTERNAL"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="dealerMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXTERNAL">
                      External — dealer pays
                    </SelectItem>
                    <SelectItem value="INTERNAL">
                      Internal — final customer pays
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {!isProfilePage && (
          <div>
            <Label htmlFor="installationPriceProfileId">
              Installation Price Profile
            </Label>
            <Controller
              name="installationPriceProfileId"
              control={control}
              render={({ field }) => (
                <Select
                  value={
                    field.value == null ? "ROLE_DEFAULT" : String(field.value)
                  }
                  onValueChange={(value) =>
                    field.onChange(
                      value === "ROLE_DEFAULT" ? null : Number(value),
                    )
                  }
                >
                  <SelectTrigger id="installationPriceProfileId">
                    <SelectValue placeholder="Use role or default profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROLE_DEFAULT">
                      Use role, then default
                    </SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={String(profile.id)}>
                        {profile.name}
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
        <div className="space-y-4">
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
                  Enable to assign a specific markup different from the
                  role&apos;s default.
                </p>
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

                <Input
                  id="markupOverride"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  required
                  {...register("markupOverride")}
                  placeholder="Enter custom markup..."
                />
              </div>
            )}

            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />

              <div>
                <p className="font-semibold text-blue-900">How Markup Works</p>

                <p className="text-blue-700">
                  The user will use the markup from their assigned role (
                  {`"${
                    roles.find((role) => role.id === Number(selectedRoleId))
                      ?.name
                  }"`}
                  , currently {Number((Number(defaultMarkup) * 100).toFixed(4))}
                  %). If you enable and set a custom markup, that value will be
                  used instead.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-white p-4">
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
        <Button type="submit" disabled={!hasUnsavedChanges || showLoadingState}>
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
