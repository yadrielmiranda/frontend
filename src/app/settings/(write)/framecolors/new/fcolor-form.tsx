"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createFColor, updateFColor } from "@/app/api/fcolors.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";
import { toast } from "sonner";

type FormData = { color: string };

export function FcolorForm({ fcolor }: { fcolor?: FormData & { id: number } }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const { user } = useAuth();
  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: { color: fcolor?.color || "" },
  });

  const showLoadingState = isSubmitting || isSuccess;

  const onSubmit = handleSubmit(async (data) => {
    if (!canEdit) return;

    try {
      if (params.id) {
        await updateFColor(Number(params.id), data);
        toast.success("Color updated!");
      } else {
        await createFColor(data);
        toast.success("Color created!");
      }
      setIsSuccess(true);
      router.push("/settings/framecolors");
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="Enter color name"
            disabled={!canEdit || showLoadingState}
            {...register("color", { required: "The color name is required" })}
          />
          {errors.color && (
            <p className="text-red-500 text-sm mt-1">{errors.color.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant={params.id ? "blue" : "green"}
            disabled={!canEdit || !isDirty || showLoadingState}
          >
            {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLoadingState ? "Saving..." : params.id ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
