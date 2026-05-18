// src/app/settings/brands/new/page.tsx
import { BrandForm } from "./brand-form";
import { FormPageShell } from "@/components/layout/form-page-shell";

export default function NewBrand() {
  return (
    <FormPageShell
      backHref="/settings/brands"
      backLabel="Back to Brands"
      title="New Brand"
      description="Create a new brand available in the system."
      maxWidth="max-w-xl"
    >
      <BrandForm />
    </FormPageShell>
  );
}
