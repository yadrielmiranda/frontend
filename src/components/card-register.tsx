"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { ArrowLeft, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

import { registerUser } from "@/app/api/auth/me/auth.api";

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
      message: "Please select a valid US state.",
    }),

  postalCode: z
    .string()
    .transform((v) => normalizeUSZip(v))
    .refine((v) => isValidUSZip(v), {
      message: "Please enter a valid ZIP code.",
    }),

  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function CardRegister() {
  const router = useRouter();
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

  // Busca la ciudad y el estado automáticamente usando el ZIP.
  const zip = useWatch({ control, name: "postalCode" });

  useEffect(() => {
    const zip5 = normalizeUSZip(zip);
    if (!isValidUSZip(zip5)) return;

    lookupZip(zip5)
      .then((res) => {
        if (!res) return;

        // No sobreescribas valores que el usuario ya escribió.
        if (!getValues("city")) {
          setValue("city", res.city, { shouldDirty: true });
        }

        if (!getValues("state")) {
          setValue("state", res.state, { shouldDirty: true });
        }
      })
      .catch(() => {});
  }, [zip, getValues, setValue]);

  const handleRegister = async (data: RegisterFormData) => {
    try {
      await registerUser(data);

      toast.success("Account created successfully.", {
        description: "You can now sign in with your new client account.",
      });

      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error("Registration failed", {
        description:
          err?.message || "Please review your information and try again.",
      });
    }
  };

  const handleBackToSignIn = () => {
    router.push("/");
  };

  const RequiredMark = () => <span className="ml-0.5 text-red-500">*</span>;

  const labelClass = "text-xs font-medium text-white";
  const inputClass =
    "h-11 border-white/15 bg-black/35 text-white placeholder:text-white/35 focus-visible:ring-red-600";
  const errorClass = "text-xs text-red-400";

  return (
    <Card className="w-full max-w-2xl rounded-3xl border border-red-600/70 bg-black/45 text-white shadow-[0_0_45px_rgba(220,38,38,0.12)] backdrop-blur-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold text-white">
          Create Client Account
        </CardTitle>

        <CardDescription className="text-sm text-white/45">
          Enter your information to create a client access account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(handleRegister)}>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className={labelClass}>
              First Name
              <RequiredMark />
            </Label>

            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder="Enter your first name"
              className={inputClass}
              {...register("firstName")}
            />

            {errors.firstName && (
              <p className={errorClass}>{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className={labelClass}>
              Last Name
              <RequiredMark />
            </Label>

            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder="Enter your last name"
              className={inputClass}
              {...register("lastName")}
            />

            {errors.lastName && (
              <p className={errorClass}>{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email" className={labelClass}>
              Email
              <RequiredMark />
            </Label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              className={inputClass}
              {...register("email")}
            />

            {errors.email && (
              <p className={errorClass}>{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className={labelClass}>
              Phone
              <RequiredMark />
            </Label>

            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Enter your phone number"
              className={inputClass}
              {...register("phone")}
            />

            {errors.phone && (
              <p className={errorClass}>{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className={labelClass}>
              Username
              <RequiredMark />
            </Label>

            <Input
              id="username"
              autoComplete="username"
              placeholder="Choose a username"
              className={inputClass}
              {...register("username")}
            />

            {errors.username && (
              <p className={errorClass}>{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street" className={labelClass}>
              Street Address
              <RequiredMark />
            </Label>

            <Input
              id="street"
              autoComplete="address-line1"
              placeholder="Enter your street address"
              className={inputClass}
              {...register("street")}
            />

            {errors.street && (
              <p className={errorClass}>{errors.street.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className={labelClass}>
              City
              <RequiredMark />
            </Label>

            <Input
              id="city"
              autoComplete="address-level2"
              placeholder="City"
              className={inputClass}
              {...register("city")}
            />

            {errors.city && <p className={errorClass}>{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <StateCombobox
              control={control}
              name="state"
              label="State *"
              placeholder="Select state..."
              error={errors.state?.message}
              appearance="dark"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="postalCode" className={labelClass}>
              ZIP Code
              <RequiredMark />
            </Label>

            <Input
              id="postalCode"
              autoComplete="postal-code"
              placeholder="Enter your ZIP code"
              className={inputClass}
              {...register("postalCode")}
            />

            {errors.postalCode && (
              <p className={errorClass}>{errors.postalCode.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password" className={labelClass}>
              Password
              <RequiredMark />
            </Label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
                className={`${inputClass} pr-10`}
                {...register("password")}
              />

              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/45 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {errors.password && (
              <p className={errorClass}>{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-5">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-red-600 font-semibold text-white shadow-lg shadow-red-950/40 hover:bg-red-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
            onClick={handleBackToSignIn}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
