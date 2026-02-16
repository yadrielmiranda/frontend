// src/app/api/brandings.api.ts
import { apiFetch } from "./_base";

export type BrandingType = "COMPANY" | "DEALER";

export type Branding = {
  id: number;
  type: BrandingType;
  userId: number | null;

  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;

  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;

  logoUrl: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
};

export type CreateBrandingData = {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  logoUrl?: string;
  isActive?: boolean;
};

export type UpdateBrandingData = Partial<CreateBrandingData>;

// =====================================================
// COMPANY
// =====================================================

export function getCompanyBranding() {
  return apiFetch<Branding | null>("/api/brandings/company");
}

export function createCompanyBranding(data: CreateBrandingData) {
  return apiFetch<Branding>("/api/brandings/company", {
    method: "POST",
    body: data,
  });
}

export function updateCompanyBranding(data: UpdateBrandingData) {
  return apiFetch<Branding>("/api/brandings/company", {
    method: "PATCH",
    body: data,
  });
}

// =====================================================
// DEALER (mi branding)
// =====================================================

export function getDealerBranding() {
  return apiFetch<Branding | null>("/api/brandings/me");
}

export function createDealerBranding(data: CreateBrandingData) {
  return apiFetch<Branding>("/api/brandings/me", {
    method: "POST",
    body: data,
  });
}

export function updateDealerBranding(data: UpdateBrandingData) {
  return apiFetch<Branding>("/api/brandings/me", {
    method: "PATCH",
    body: data,
  });
}

// =====================================================
// UPLOAD LOGO (Opción 2)
// =====================================================

export function uploadDealerLogo(file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiFetch<{ logoUrl: string }>("/api/brandings/me/logo", {
    method: "POST",
    body: form,
  });
}

export function uploadCompanyLogo(file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiFetch<{ logoUrl: string }>("/api/brandings/company/logo", {
    method: "POST",
    body: form,
  });
}
