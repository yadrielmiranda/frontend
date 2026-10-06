"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  createMuntinPattern,
  updateMuntinPattern,
} from "@/app/api/muntin-patterns.api";

interface MuntinPatternFormValues {
  name: string;
  inputMode: "NONE" | "GRID" | "PRESET";
  requiresType: boolean;
  isActive: boolean;
  isDefault: boolean;
}

interface MuntinPatternFormProps {
  pattern?: {
    id?: number;
    name: string;
    requiresLites: boolean;
    inputMode?: "NONE" | "GRID" | "PRESET";
    requiresType?: boolean;
    isActive: boolean;
    isDefault: boolean;
  };
}

export function MuntinPatternForm({
  pattern,
}: MuntinPatternFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MuntinPatternFormValues>({
    defaultValues: {
      name: pattern?.name || "",
      inputMode: pattern?.inputMode ?? (pattern?.requiresLites === false ? "NONE" : "GRID"),
      requiresType: pattern?.requiresType ?? pattern?.requiresLites ?? true,
      isActive: pattern?.isActive ?? true,
      isDefault: pattern?.isDefault ?? false,
    },
  });

  const inputMode = watch("inputMode");

  const onSubmit: SubmitHandler<MuntinPatternFormValues> = async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        inputMode: data.inputMode,
        requiresType: data.inputMode === "NONE" ? false : Boolean(data.requiresType),
        isActive: Boolean(data.isActive),
        isDefault: Boolean(data.isDefault),
      };

      if (isEdit && pattern?.id) {
        await updateMuntinPattern(pattern.id, payload);
        toast.success("Muntin pattern updated successfully.");
      } else {
        await createMuntinPattern(payload);
        toast.success("Muntin pattern created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/muntin-patterns");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      console.error("Error saving muntin pattern:", err);
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Pattern Name</Label>
        <Input
          id="name"
          placeholder="e.g., Full View, Colonial"
          autoComplete="off"
          {...register("name", { required: "Pattern name is required." })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div>
          <p className="text-sm font-medium">Options</p>
          <p className="text-sm text-muted-foreground">
            Configure how this muntin pattern behaves.
          </p>
        </div>

        <Controller
          name="inputMode"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="inputMode">Pattern design</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                <SelectTrigger id="inputMode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No muntin (Full View)</SelectItem>
                  <SelectItem value="GRID">Adjustable grid</SelectItem>
                  <SelectItem value="PRESET">Fixed design</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {field.value === "NONE" ? "Clear glass without muntin bars. Available for every configuration and glass."
                  : field.value === "GRID" ? "Enter Horizontal and Vertical lites for each panel when creating a piece."
                    : "Identifies a fixed pattern without editable lites. Its name and type appear in the specifications; a diagram for this design is not available yet."}
              </p>
            </div>
          )}
        />

        {inputMode !== "NONE" && <Controller
          name="requiresType"
          control={control}
          render={({ field }) => (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox id="requiresType" checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={isSubmitting} />
                <Label htmlFor="requiresType">Choose a muntin type</Label>
              </div>
              <p className="text-xs text-muted-foreground">Ask for a profile such as Flat-Flat or Ogee-Flat. Allowed types are managed separately for each series, configuration and glass.</p>
            </div>
          )}
        />}

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}
        />

        <Controller
          name="isDefault"
          control={control}
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="isDefault">Default Pattern</Label>
            </div>
          )}
        />
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        Only one pattern should be marked as default. If this one is saved as
        default, the system will automatically remove the default flag from the others.
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={(!isDirty && !isEdit) || showLoadingState}
        >
          {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLoadingState
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create Muntin Pattern"}
        </Button>
      </div>
    </form>
  );
}
