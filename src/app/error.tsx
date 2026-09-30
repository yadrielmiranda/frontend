"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PageError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3 p-6">
      <p role="alert" className="text-sm text-destructive">Could not load this page. Please try again.</p>
      <Button type="button" variant="outline" disabled={isPending} onClick={() => startTransition(() => {
        router.refresh();
        reset();
      })}>
        {isPending ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
