"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";

import { registerUser } from "@/app/api/auth/me/auth.api";
import { useLoginDialog } from "@/contexts/LoginDialogContext";

import { StateCombobox } from "@/components/StateCombobox";
import { US_STATES } from "@/lib/us-states";

import { lookupZip } from "@/app/api/geo.api";
import { isValidUSZip, normalizeUSZip } from "@/lib/validators-zip";
import { isValidEmail, normalizeEmail } from "@/lib/validators-email";
import { isValidUSPhone, normalizeUSPhoneToE164 } from "@/lib/validators-phone";

const registerSchema = z.object({
  firstName: z.string().min(1, {
    message: "First name is required.",
  }),

  lastName: z.string().min(1, {
    message: "Last name is required.",
  }),

  email: z
    .string()
    .transform((v) => normalizeEmail(v) ?? "")
    .refine((v) => isValidEmail(v), {
      message: "Please enter a valid email address.",
    }),

  phone: z
    .string()
    .transform((v) => normalizeUSPhoneToE164(v) ?? "")
    .refine((v) => isValidUSPhone(v), {
      message: "Please enter a valid US phone number.",
    }),

  username: z.string().min(3, {
    message: "Username must be at least 3 characters long.",
  }),

  street: z.string().min(1, {
    message: "Street address is required.",
  }),

  city: z.string().min(1, {
    message: "City is required.",
  }),

  state: z
    .string()
    .min(2, {
      message: "State is required.",
    })
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => US_STATES.some((s) => s.value === v), {
      message: "Please select a valid US state (e.g. FL).",
    }),

  postalCode: z
    .string()
    .transform((v) => normalizeUSZip(v))
    .refine((v) => isValidUSZip(v), {
      message: "Please enter a valid ZIP code (5 digits).",
    }),

  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function CardRegister() {
  const router = useRouter();
  const { openLoginDialog } = useLoginDialog();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      username: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      password: "",
    },
  });

  // ZIP lookup -> auto city/state (como Estimate)
  const zip = useWatch({ control, name: "postalCode" });

  useEffect(() => {
    const zip5 = normalizeUSZip(zip);
    if (!isValidUSZip(zip5)) return;

    lookupZip(zip5)
      .then((res) => {
        if (!res) return;

        // NO pises si ya escribieron
        if (!getValues("city"))
          setValue("city", res.city, { shouldDirty: true });
        if (!getValues("state"))
          setValue("state", res.state, { shouldDirty: true });
      })
      .catch(() => {});
  }, [zip, getValues, setValue]);

  const handleRegister = async (data: RegisterFormData) => {
    try {
      // registerUser espera Omit<CreateUserDto, 'idRole'>
      await registerUser(data);

      toast.success("¡Registro exitoso!", {
        description: "Ahora inicia sesión.",
      });

      openLoginDialog();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error("Error en el registro", {
        description:
          err?.message || "Por favor, verifica tus datos e inténtalo de nuevo.",
      });
    }
  };

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>Ingresa tus datos para registrarte.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(handleRegister)}>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name
              <RequiredMark />
            </Label>
            <Input
              id="firstName"
              placeholder="write your First Name"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name
              <RequiredMark />
            </Label>
            <Input
              id="lastName"
              placeholder="write your Last Name"
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">
              Email
              <RequiredMark />
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="enter your email examp: tu@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone
              <RequiredMark />
            </Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="enter your phone number"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">
              Username
              <RequiredMark />
            </Label>
            <Input
              id="username"
              autoComplete="username"
              placeholder="enter your username"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street">
              Street
              <RequiredMark />
            </Label>
            <Input
              id="street"
              autoComplete="address-line1"
              placeholder="enter your street address"
              {...register("street")}
            />
            {errors.street && (
              <p className="text-sm text-red-500">{errors.street.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">
              City
              <RequiredMark />
            </Label>
            <Input
              id="city"
              autoComplete="address-level2"
              placeholder="City"
              {...register("city")}
            />
            {errors.city && (
              <p className="text-sm text-red-500">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <StateCombobox
              control={control}
              name="state"
              label="State *"
              placeholder="Select state…"
              error={errors.state?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">
              ZIP Code
              <RequiredMark />
            </Label>
            <Input
              id="postalCode"
              autoComplete="postal-code"
              placeholder="write your ZIP code"
              {...register("postalCode")}
            />
            {errors.postalCode && (
              <p className="text-sm text-red-500">
                {errors.postalCode.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">
              Password
              <RequiredMark />
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password")}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4 pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Registrando..." : "Registrarse"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
