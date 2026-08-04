import type { InstallationService } from "@/lib/types";

export type AdditionalServiceField =
  | "widthIn"
  | "heightIn"
  | "areaSqFt"
  | "panelCount"
  | "lengthIn";

export type AdditionalServiceDraft = {
  widthIn: string;
  heightIn: string;
  areaSqFt: string;
  panelCount: string;
  lengthIn: string;
  occurrences: string;
  description: string;
};

export const additionalServiceFieldMeta: Record<
  AdditionalServiceField,
  { label: string; step: string; integer?: boolean }
> = {
  widthIn: { label: "Width (in)", step: "0.001" },
  heightIn: { label: "Height (in)", step: "0.001" },
  areaSqFt: { label: "Area (sq ft)", step: "0.0001" },
  panelCount: { label: "Panel count", step: "1", integer: true },
  lengthIn: { label: "Length (in)", step: "0.001" },
};

export function emptyAdditionalServiceDraft(): AdditionalServiceDraft {
  return {
    widthIn: "",
    heightIn: "",
    areaSqFt: "",
    panelCount: "",
    lengthIn: "",
    occurrences: "1",
    description: "",
  };
}

export function additionalServiceFields(
  service: Pick<InstallationService, "billingUnit" | "ruleMetric">,
): AdditionalServiceField[] {
  const required = new Set<AdditionalServiceField>();

  switch (service.ruleMetric) {
    case "WIDTH":
      required.add("widthIn");
      break;
    case "HEIGHT":
      required.add("heightIn");
      break;
    case "AREA":
      required.add("areaSqFt");
      break;
    case "PANEL_COUNT":
      required.add("panelCount");
      break;
    case "LENGTH":
      required.add("lengthIn");
      break;
  }

  switch (service.billingUnit) {
    case "PANEL":
      required.add("panelCount");
      break;
    case "SQFT":
    case "SQFT_RECTANGULAR":
      required.add("areaSqFt");
      break;
    case "LINEAR_FOOT":
      required.add("lengthIn");
      break;
  }

  const displayOrder: AdditionalServiceField[] = [
    "widthIn",
    "heightIn",
    "areaSqFt",
    "panelCount",
    "lengthIn",
  ];
  return displayOrder.filter((field) => required.has(field));
}

export function additionalServiceValidationError(
  service: InstallationService | null | undefined,
  draft: AdditionalServiceDraft,
): string | null {
  if (!service) return "Select an additional service.";

  const occurrences = Number(draft.occurrences);
  if (!Number.isInteger(occurrences) || occurrences < 1) {
    return "Quantity must be a whole number greater than zero.";
  }

  for (const field of additionalServiceFields(service)) {
    const value = Number(draft[field]);
    const meta = additionalServiceFieldMeta[field];
    if (!Number.isFinite(value) || value <= 0) {
      return `${meta.label} is required and must be greater than zero.`;
    }
    if (meta.integer && !Number.isInteger(value)) {
      return `${meta.label} must be a whole number.`;
    }
  }

  return null;
}

export function additionalServiceValues(
  service: InstallationService,
  draft: AdditionalServiceDraft,
) {
  const values: {
    widthIn?: number;
    heightIn?: number;
    areaSqFt?: number;
    panelCount?: number;
    lengthIn?: number;
    occurrences: number;
    description?: string;
  } = {
    occurrences: Number(draft.occurrences),
  };

  for (const field of additionalServiceFields(service)) {
    values[field] = Number(draft[field]);
  }

  const description = draft.description.trim();
  if (description) values.description = description;
  return values;
}
