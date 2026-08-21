"use client";

import { useState } from "react";
import { Copy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { getOrCreateEstimatePublicToken } from "@/app/api/estimates.api";
import { Button } from "@/components/ui/button";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) throw new Error("Could not copy the payment link.");
}

export function EstimatePaymentLinkActions({
  estimateId,
  estimateNumber,
  showShare = false,
  size = "default",
}: {
  estimateId: number;
  estimateNumber?: string;
  showShare?: boolean;
  size?: "default" | "sm";
}) {
  const [busyAction, setBusyAction] = useState<"copy" | "share" | null>(null);

  const getPaymentUrl = async () => {
    const response = await getOrCreateEstimatePublicToken(
      estimateId,
      "detailed",
    );
    if (!response.token)
      throw new Error("Could not generate the payment link.");
    return `${window.location.origin}/public/payments/${response.token}`;
  };

  const copyPaymentLink = async () => {
    setBusyAction("copy");
    try {
      await copyText(await getPaymentUrl());
      toast.success("Payment link copied.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const sharePaymentLink = async () => {
    setBusyAction("share");
    try {
      const url = await getPaymentUrl();
      const label = estimateNumber ? ` #${estimateNumber}` : "";

      if (navigator.share) {
        await navigator.share({
          title: `Project payment${label}`,
          text: `Use this secure link to pay project charge${label}.`,
          url,
        });
      } else {
        await copyText(url);
        toast.success("Payment link copied.");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        toast.error((error as Error).message);
      }
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={busyAction !== null}
        onClick={() => void copyPaymentLink()}
      >
        {busyAction === "copy" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {busyAction === "copy" ? "Copying..." : "Copy payment link"}
      </Button>

      {showShare && (
        <Button
          type="button"
          size={size}
          disabled={busyAction !== null}
          onClick={() => void sharePaymentLink()}
        >
          {busyAction === "share" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          Share payment link
        </Button>
      )}
    </div>
  );
}
