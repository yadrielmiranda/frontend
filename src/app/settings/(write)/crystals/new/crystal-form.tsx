"use client";

import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { createCrystal, updateCrystal } from "@/app/api/crystals.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Crystal } from "@/app/api/types";

type FormData = {
  glass: string;
};

export function CrystalForm({ crystal }: { crystal?: Crystal }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      glass: crystal?.glass || "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (params.id) {
        await updateCrystal(Number(params.id), data);
        toast.success("Crystal updated successfully!");
      } else {
        await createCrystal(data);
        toast.success("Crystal created successfully!");
      }
      setIsSuccess(true);
      router.push("/settings/crystals");
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
          <Label htmlFor="glass">Glass</Label>
          <Input
            id="glass"
            placeholder="Enter glass type"
            {...register("glass", {
              required: "The glass type is required",
            })}
          />
          {errors.glass && <p className="text-red-500 text-sm mt-1">{errors.glass.message}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={params.id ? "blue" : "green"}
            disabled={!isDirty || showLoadingState}
          >
            {showLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showLoadingState ? "Saving..." : (params.id ? "Update" : "Create")}
          </Button>
        </div>
      </div>
    </form>
  );
}
