"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  createDealerBranding,
  updateDealerBranding,
  createCompanyBranding,
  updateCompanyBranding,
  uploadDealerLogo,
  uploadCompanyLogo,
  type Branding,
  type CreateBrandingData,
  type UpdateBrandingData,
} from "@/app/api/brandings.api";

import { lookupZip } from "@/app/api/geo.api";
import { isValidUSZip, normalizeUSZip } from "@/lib/validators-zip";

import { StateCombobox } from "@/components/StateCombobox";
import { US_STATES } from "@/lib/us-states";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormData = {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string; // "FL"
  postalCode?: string;
  logoUrl?: string;
};

function normalizePayload(data: FormData): CreateBrandingData {
  return {
    name: data.name.trim(),
    phone: data.phone?.trim() || undefined,
    email: data.email?.trim() || undefined,
    website: data.website?.trim() || undefined,
    street: data.street?.trim() || undefined,
    city: data.city?.trim() || undefined,
    state: data.state?.trim().toUpperCase() || undefined,
    postalCode: data.postalCode?.trim() || undefined,
    logoUrl: data.logoUrl?.trim() || undefined,
  };
}

export function BrandingForm({
  branding,
  mode,
}: {
  branding?: Branding;
  mode: "company" | "dealer";
}) {
  const router = useRouter();

  const [brandingState, setBrandingState] = useState<Branding | undefined>(
    branding
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultValues = useMemo<FormData>(
    () => ({
      name: brandingState?.name ?? "",
      phone: brandingState?.phone ?? "",
      email: brandingState?.email ?? "",
      website: brandingState?.website ?? "",
      street: brandingState?.street ?? "",
      city: brandingState?.city ?? "",
      state: brandingState?.state ?? "",
      postalCode: brandingState?.postalCode ?? "",
      logoUrl: brandingState?.logoUrl ?? "",
    }),
    [brandingState]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({ defaultValues });

  // Sincroniza form cuando cambie brandingState (create/update)
  useEffect(() => {
    reset(defaultValues, { keepDirty: false, keepTouched: true });
  }, [defaultValues, reset]);

  const logoUrl = useWatch({ control, name: "logoUrl" });
  const zip = useWatch({ control, name: "postalCode" });

  // ZIP lookup -> auto city/state (no pisa si ya escribieron)
  useEffect(() => {
    const zip5 = normalizeUSZip(zip);
    if (!isValidUSZip(zip5)) return;

    lookupZip(zip5)
      .then((res) => {
        if (!res) return;

        if (!getValues("city")) {
          setValue("city", res.city, { shouldDirty: true });
        }

        // Solo setea state si está vacío y si el código existe en US_STATES
        const state = (res.state || "").trim().toUpperCase();
        if (!getValues("state") && US_STATES.some((s) => s.value === state)) {
          setValue("state", state, { shouldDirty: true });
        }
      })
      .catch(() => {});
  }, [zip, getValues, setValue]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const result =
        mode === "company"
          ? await uploadCompanyLogo(file)
          : await uploadDealerLogo(file);

      setValue("logoUrl", result.logoUrl, {
        shouldDirty: true,
        shouldTouch: true,
      });

      toast.success("Logo uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = normalizePayload(data);

      let saved: Branding;

      if (brandingState) {
        const updatePayload: UpdateBrandingData = payload;

        saved =
          mode === "company"
            ? await updateCompanyBranding(updatePayload)
            : await updateDealerBranding(updatePayload);

        toast.success("Branding updated successfully.");
      } else {
        saved =
          mode === "company"
            ? await createCompanyBranding(payload)
            : await createDealerBranding(payload);

        toast.success("Branding created successfully.");
      }

      setBrandingState(saved);
      router.push("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      console.error(err);
    }
  });

  const saving = isSubmitting;
  const disableAll = saving || uploading;

  function handleClose() {
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Leave anyway?");
      if (!ok) return;
    }
    router.push("/");
  }

  function handleDiscard() {
    reset(defaultValues, { keepDirty: false, keepTouched: true });
    toast.message("Changes discarded.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div>
          <Label>Name</Label>
          <Input
            disabled={disableAll}
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label>Phone</Label>
          <Input disabled={disableAll} {...register("phone")} />
        </div>

        <div>
          <Label>Email</Label>
          <Input disabled={disableAll} type="email" {...register("email")} />
        </div>

        <div>
          <Label>Website</Label>
          <Input disabled={disableAll} {...register("website")} />
        </div>

        <div>
          <Label>Street</Label>
          <Input disabled={disableAll} {...register("street")} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>City</Label>
            <Input disabled={disableAll} {...register("city")} />
          </div>

          {/* ✅ State combobox pro */}
          <div className="space-y-2">
            <StateCombobox
              control={control}
              name="state"
              label="State"
              placeholder="Select state..."
              error={errors.state?.message as string | undefined}
              disabled={disableAll}
            />
          </div>
        </div>

        <div>
          <Label>ZIP Code</Label>
          <Input disabled={disableAll} {...register("postalCode")} />
        </div>

        <div>
          <Label>Logo</Label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disableAll}
            onChange={handleLogoUpload}
          />

          <div className="flex items-center gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={disableAll}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {logoUrl ? "Change logo" : "Choose logo"}
                </>
              )}
            </Button>

            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-16 w-16 rounded border object-contain bg-white"
              />
            )}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {logoUrl
              ? "Logo set. Remember to save if you want to keep it linked to the branding."
              : "Upload a logo (PNG/JPG/WEBP). Max 2MB."}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={disableAll}
          >
            Close
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={disableAll || !isDirty}
          >
            Discard
          </Button>
        </div>

        <Button type="submit" disabled={disableAll || !isDirty}>
          {(saving || uploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
