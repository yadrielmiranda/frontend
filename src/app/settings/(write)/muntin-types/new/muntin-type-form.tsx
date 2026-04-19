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

import {
  createMuntinType,
  updateMuntinType,
} from "@/app/api/muntin-types.api";

interface MuntinTypeFormValues {
  name: string;
  isActive: boolean;
}

interface MuntinTypeFormProps {
  typeItem?: {
    id?: number;
    name: string;
    isActive: boolean;
  };
}

export function MuntinTypeForm({ typeItem }: MuntinTypeFormProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const isEdit = Boolean(params.id);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MuntinTypeFormValues>({
    defaultValues: {
      name: typeItem?.name || "",
      isActive: typeItem?.isActive ?? true,
    },
  });

  const onSubmit: SubmitHandler<MuntinTypeFormValues> = async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        isActive: Boolean(data.isActive),
      };

      if (isEdit && typeItem?.id) {
        await updateMuntinType(typeItem.id, payload);
        toast.success("Muntin type updated successfully.");
      } else {
        await createMuntinType(payload);
        toast.success("Muntin type created successfully.");
      }

      setIsSuccess(true);
      router.push("/settings/muntin-types");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      console.error("Error saving muntin type:", err);
    }
  };

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Type Name</Label>
        <Input
          id="name"
          placeholder="e.g., None, 1 in Flat-Flat"
          autoComplete="off"
          {...register("name", { required: "Type name is required." })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div>
          <p className="text-sm font-medium">Options</p>
          <p className="text-sm text-muted-foreground">
            Configure whether this muntin type is active.
          </p>
        </div>

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
              : "Create Muntin Type"}
        </Button>
      </div>
    </form>
  );
}