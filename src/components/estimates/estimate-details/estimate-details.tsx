"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { EstimateWithRelations } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Printer, Eye, X } from "lucide-react";
import { BackLink } from "@/components/navigation/back-link";

import { EstimateReportShell } from "./parts/estimate-report-shell";
import { EstimateViewClient } from "./views/estimate-view-client";
import { EstimateViewDealerInternal } from "./views/estimate-view-dealer-internal";
import { EstimateViewAdmin } from "./views/estimate-view-admin";
import { EstimateViewDealerPublic } from "./views/estimate-view-dealer-public";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// =============================
// ESTIMATE DETAILS
// =============================

export function EstimateDetails({
  estimate,
  userRole,
}: {
  estimate: EstimateWithRelations;
  userRole: string;
}) {
  const [isPublicView, setIsPublicView] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const isDealer = userRole === "dealer";

  // ✅ Ref del contenido que vamos a imprimir (HTML/SVG)
  const printRef = useRef<HTMLDivElement | null>(null);

  // Link público para compartir (solo dealer public)
  const publicLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}?view=public`;
  }, []);

  // ================
  // Selector de vista
  // ================
  const viewContent = useMemo(() => {
    if (isDealer && isPublicView) {
      return <EstimateViewDealerPublic estimate={estimate} />;
    }

    switch (userRole) {
      case "admin":
      case "operator":
        return <EstimateViewAdmin estimate={estimate} />;
      case "dealer":
        return <EstimateViewDealerInternal estimate={estimate} />;
      case "client":
      default:
        return <EstimateViewClient estimate={estimate} />;
    }
  }, [estimate, isDealer, isPublicView, userRole]);

  const handleOpenPrintPreview = () => setPrintOpen(true);

  // ==========================================
  // PRINT (como fabricante): iframe + DOM limpio
  // ==========================================
  const printHtml = () => {
    const el = printRef.current;
    if (!el) return;

    // ✅ Crear iframe invisible
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return;
    }

    // ✅ Copiar estilos actuales (tailwind + globals + shadcn)
    // Nota: esto copia <link rel="stylesheet"> y <style> presentes en el documento.
    const styles = Array.from(
      document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
        'link[rel="stylesheet"], style',
      ),
    )
      .map((node) => node.outerHTML)
      .join("\n");

    // ✅ Contenido a imprimir (solo el reporte)
    const html = el.outerHTML;

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Estimate</title>
          ${styles}
          <style>
            /* Ajustes de impresión */
            @page { size: auto; margin: 12mm; }
            html, body { background: #fff !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* Evita que salgan elementos marcados como print:hidden */
            .print\\:hidden { display: none !important; }
            /* Quita fondos grises del layout si existieran */
            .bg-gray-50, .bg-gray-100 { background: #fff !important; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `);
    doc.close();

    // ✅ Esperar a que cargue y disparar print
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        iframe.remove();
        return;
      }

      // Pequeño delay para asegurar fonts/layout
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          // noop
        }

        // ✅ cleanup
        window.setTimeout(() => {
          try {
            iframe.remove();
          } catch {
            // noop
          }
        }, 1000);
      }, 150);
    };
  };

  // Limpieza “por si acaso” al desmontar (evitar iframes huérfanos en edge cases)
  useEffect(() => {
    return () => {
      const iframes = Array.from(document.querySelectorAll("iframe[aria-hidden='true']"));
      for (const f of iframes) {
        try {
          // Solo removemos los 0x0 invisibles (nuestros)
          const style = (f as HTMLIFrameElement).style;
          if (style.width === "0px" || style.width === "0") f.remove();
        } catch {
          // noop
        }
      }
    };
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <BackLink href="/estimates" label="Back to Estimates" />

          <div className="flex items-center gap-2">
            {isDealer && (
              <Button variant="ghost" onClick={() => setIsPublicView((v) => !v)}>
                <Eye className="mr-2 h-4 w-4" />
                {isPublicView ? "View My Report" : "Customer View"}
              </Button>
            )}

            <Button onClick={handleOpenPrintPreview}>
              <Printer className="mr-2 h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>

        {isDealer && isPublicView && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm print:hidden">
            <p>
              You are viewing the customer version of this report.{" "}
              <a
                href={publicLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                Open this link in a new tab
              </a>{" "}
              to share it.
            </p>
          </div>
        )}

        {/* ✅ Vista normal */}
        <EstimateReportShell estimate={estimate}>{viewContent}</EstimateReportShell>

        {/* =============================
            PRINT PREVIEW MODAL (HTML/SVG)
           ============================= */}
        <Dialog open={printOpen} onOpenChange={setPrintOpen}>
          <DialogContent
            className="
              !p-0
              !w-[98vw] !max-w-[98vw]
              !h-[96vh] !max-h-[96vh]
              overflow-hidden
              min-w-0
            "
          >
            <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between print:hidden">
              <DialogTitle>Estimate Preview</DialogTitle>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrintOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>

                {/* ✅ Esto imprime lo que ves (HTML/SVG), sin PDF del backend */}
                <Button size="sm" onClick={printHtml}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print / Save as PDF
                </Button>
              </div>
            </DialogHeader>

            {/* Contenedor scrollable del preview */}
            <div className="h-[calc(96vh-56px)] w-full bg-gray-100 overflow-auto p-10 print:hidden">
              {/* “Page” look */}
              <div className="mx-auto w-full max-w-[820px]">
                <div className="bg-white shadow-lg border border-gray-200">
                  {/* ✅ Importante: este ref apunta EXACTAMENTE a lo que se imprime */}
                  <div ref={printRef} className="p-8">
                    <EstimateReportShell estimate={estimate}>
                      {viewContent}
                    </EstimateReportShell>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
