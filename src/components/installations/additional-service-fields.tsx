"use client";

import type { InstallationService } from "@/lib/types";
import {
  additionalServiceFieldMeta,
  additionalServiceFields,
  type AdditionalServiceDraft,
} from "@/lib/installation-additional-service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdditionalServiceFields({
  service,
  value,
  onChange,
}: {
  service: InstallationService | null;
  value: AdditionalServiceDraft;
  onChange: (value: AdditionalServiceDraft) => void;
}) {
  const fields = service ? additionalServiceFields(service) : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => {
        const meta = additionalServiceFieldMeta[field];
        return (
          <div key={field} className="space-y-1">
            <Label>{meta.label}</Label>
            <Input
              type="number"
              min={meta.step}
              step={meta.step}
              value={value[field]}
              onChange={(event) =>
                onChange({ ...value, [field]: event.target.value })
              }
            />
          </div>
        );
      })}
      <div className="space-y-1">
        <Label>Quantity</Label>
        <Input
          type="number"
          min="1"
          step="1"
          value={value.occurrences}
          onChange={(event) =>
            onChange({ ...value, occurrences: event.target.value })
          }
        />
      </div>
    </div>
  );
}
