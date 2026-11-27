"use client";

import { useState } from "react";
import { buildGarageDesignSvg, validateGarageDesignTemplate } from "@/lib/garage-design-templates";
import { safeDesignImageUrl } from "@/lib/garage-designs";

export interface GarageDesignPreviewProps {
  locale?: "en" | "es";
  template?: unknown;
  imageUrl?: string | null;
  color?: string | null;
  name: string;
  className?: string;
}

export function GarageDesignPreview({ template, imageUrl, color, name, className, locale = "en" }: GarageDesignPreviewProps) {
  const geometry = validateGarageDesignTemplate(template);
  const svg = geometry ? buildGarageDesignSvg(geometry, color, name) : null;
  const src = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : safeDesignImageUrl(imageUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <div className={`flex aspect-[375/280] items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 ${className ?? ""}`}
      role="img" aria-label={locale === "es" ? `Vista previa de ${name} no disponible` : `${name} preview unavailable`}>
      {locale === "es" ? "Sin vista previa" : "No preview"}
    </div>;
  }

  // The data image is produced exclusively from validated database geometry. A custom
  // catalog URL is displayed as an image and is never fetched or parsed here.
  return <img src={src} alt={locale === "es" ? `Vista previa del diseño ${name}` : `${name} design preview`} loading="lazy" draggable={false}
    onError={() => setFailedSrc(src)} className={`aspect-[375/280] object-contain ${className ?? ""}`} />;
}
