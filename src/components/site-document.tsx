"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { documentLanguageForRoute } from "@/lib/portal-language-routes";

export function SiteDocument({ children, initialLocale }: {
  children: ReactNode;
  initialLocale: "en" | "es";
}) {
  const pathname = usePathname();
  return <html lang={documentLanguageForRoute(pathname, initialLocale)}>{children}</html>;
}
