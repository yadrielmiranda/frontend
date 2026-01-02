"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createTint, updateTint } from "@/app/api/tints.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Tint } from "@/app/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/rbac";

type FormData = {
  color: string;
};

export function TintForm({ tint }: { tint?: Tint }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      color: tint?.color || "",
    },
  });

  const { user } = useAuth();
  const role = user?.role?.name ?? null;
  const canEdit = isAdmin(role);

  const onSubmit = handleSubmit(async (data) => {
    if (!canEdit) {
      // opcional:
      // toast.error("No tienes permisos para editar.");
      return;
    }

    try {
      if (params.id) {
        await updateTint(Number(params.id), data);
        toast.success("Tint updated successfully!");
      } else {
        await createTint(data);
        toast.success("Tint created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/tints");
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    }
  });

  const showLoadingState = isSubmitting || isSuccess;

  return (
    <form onSubmit={onSubmit}>
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="Enter tint color"
            disabled={!canEdit || showLoadingState}
            {...register("color", {
              required: "The tint color is required",
            })}
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
