"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { API_URL } from "@/app/api/_base";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/app/types/auth";

type ImageAttempt = { source: string | null; started: boolean };
let sessionRecovery: { userId: number; promise: Promise<AuthUser | null> } | null = null;

/** A page of protected thumbnails should renew an expired session only once. */
export function recoverMaterialImageSession(userId: number, revalidate: () => Promise<AuthUser | null>) {
  if (sessionRecovery?.userId === userId) return sessionRecovery.promise;
  const recovery = { userId, promise: Promise.resolve().then(revalidate) };
  sessionRecovery = recovery;
  void recovery.promise.finally(() => {
    if (sessionRecovery === recovery) sessionRecovery = null;
  }).catch(() => { /* Each image handles the shared failure below. */ });
  return recovery.promise;
}

export function MaterialProductImage({ imageUrl, name, className, sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw", priority = false, compact = false }: {
  imageUrl?: string | null; name: string; className?: string; sizes?: string; priority?: boolean; compact?: boolean;
}) {
  const { user, revalidate } = useAuth();
  const source = imageUrl?.startsWith("/api/materials/images/") ? `${API_URL.replace(/\/$/, "")}${imageUrl}` : null;
  const attempt = useRef<ImageAttempt>({ source, started: false });
  if (attempt.current.source !== source) attempt.current = { source, started: false };
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const mounted = useRef(true);
  const [failedAttempt, setFailedAttempt] = useState<ImageAttempt | null>(null);
  const [retriedAttempt, setRetriedAttempt] = useState<ImageAttempt | null>(null);
  const renderedAttempt = attempt.current;
  const isRetry = retriedAttempt === renderedAttempt;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function recoverImage() {
    const current = renderedAttempt;
    const userId = user?.id;
    if (!mounted.current || attempt.current !== current) return;
    if (isRetry || !userId) { setFailedAttempt(current); return; }
    if (current.started) return;
    current.started = true;
    try {
      const account = await recoverMaterialImageSession(userId, revalidate);
      if (!mounted.current || attempt.current !== current || currentUserId.current !== userId) return;
      if (account?.id === userId) setRetriedAttempt(current);
      else setFailedAttempt(current);
    } catch {
      if (mounted.current && attempt.current === current && currentUserId.current === userId) setFailedAttempt(current);
    }
  }

  return <div className={cn("relative flex items-center justify-center overflow-hidden bg-slate-50", className)}>
    {source && failedAttempt !== attempt.current ? <Image key={`${source}:${isRetry ? "retry" : "initial"}`} src={isRetry ? `${source}?retry=1` : source} alt={name} fill unoptimized sizes={sizes} priority={priority} className={cn("object-contain", compact ? "p-1" : "p-4")} onError={() => { void recoverImage(); }} /> :
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 text-slate-400" aria-label={`No photo available for ${name}`}>
        <Package className={compact ? "h-8 w-8" : "h-12 w-12"} strokeWidth={1.25} aria-hidden="true" />
        {!compact && <span className="text-xs">No photo</span>}
      </div>}
  </div>;
}
