"use client";

import type { ReactNode } from "react";
import { BackLink } from "@/components/navigation/back-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";

const descriptions = {
  edit: { en: "Update the details for this estimate.", es: "Actualiza los detalles de esta cotización." },
  review: { en: "Review the complete estimate before creating the order.", es: "Revisa la cotización completa antes de crear la orden." },
  measured: { en: "Installation uses the current measurements and price.", es: "La instalación utiliza las medidas y el precio actuales." },
  locked: { en: "Material details are locked. Use the appropriate material revision to add pieces or request changes.", es: "Los detalles de los materiales están bloqueados. Para agregar piezas o solicitar cambios, abre la revisión de materiales correspondiente." },
};

export function EstimateEditorShell({ number, mode, children }: {
  number: string | number;
  mode: keyof typeof descriptions;
  children: ReactNode;
}) {
  const { locale } = usePortalLanguage();
  const spanish = locale === "es";
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-gray-50 py-4 md:px-4 md:py-6">
      <div className="min-w-0 w-full">
        <div lang={locale} className="mb-4 flex items-center justify-between">
          <BackLink href="/estimates" label={spanish ? "Volver a cotizaciones" : "Back to Estimates"} />
        </div>
        <Card className="relative min-w-0 max-w-full shadow-lg">
          <CardHeader lang={locale} className="min-w-0 px-4 sm:px-6 sm:pr-96">
            <CardTitle className="break-words text-xl sm:text-2xl">
              {spanish ? "Cotización" : "Estimate"} #{number}
            </CardTitle>
            <CardDescription>{descriptions[mode][locale]}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 px-4 sm:px-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
