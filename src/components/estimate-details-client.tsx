// src/components/estimate-details-client.tsx
"use client";

import { Button } from "@/components/ui/button";
import { EstimateWithRelations } from "@/app/api/types";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Eye } from "lucide-react";
import { useState } from "react";
import { formatInchesFromEighthStep, formatPsf } from "@/lib/dimensions";

// ─────────────────────────────────────────────
// Helpers genéricos
// ─────────────────────────────────────────────

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCurrency = (amount: number | string | null) => {
  const numberAmount = Number(amount);
  if (isNaN(numberAmount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numberAmount);
};

// Tipo comodín para no repetir
type PieceWithRelations = EstimateWithRelations["pieces"][number];

/**
 * Construye las líneas de descripción “profesional” de una pieza
 * (igual para vista interna y vista pública).
 */
function buildPieceDescriptionLines(piece: PieceWithRelations): string[] {
  // 1) Header principal: Producto / marca / sistema / config
  const header = [
    piece.prod?.name,
    piece.bran?.name,
    piece.syst?.name,
    piece.conf?.conf,
  ]
    .filter(Boolean)
    .join(" ");

  // 2) Size en fracciones
  const w = piece.width != null ? formatInchesFromEighthStep(piece.width) : "?";
  const h =
    piece.height != null ? formatInchesFromEighthStep(piece.height) : "?";

  const sizeParts: string[] = [`${w} x ${h}`];

  if (piece.heightLeft != null) {
    sizeParts.push(`HL ${formatInchesFromEighthStep(piece.heightLeft)}`);
  }
  if (piece.heightRight != null) {
    sizeParts.push(`HR ${formatInchesFromEighthStep(piece.heightRight)}`);
  }
  if (piece.legHeight != null) {
    sizeParts.push(`Leg ${formatInchesFromEighthStep(piece.legHeight)}`);
  }

  const sizeLine = `Size: ${sizeParts.join(" / ")}`;

  // 3) Glass
  const glassTokens: string[] = [];
  // nombres posibles de relaciones; si alguno no existe simplemente queda undefined
  if ((piece as any).cryst?.glass) glassTokens.push((piece as any).cryst.glass);
  if ((piece as any).tin?.color) glassTokens.push((piece as any).tin.color);
  if ((piece as any).coat?.name) glassTokens.push((piece as any).coat.name);

  const glassLine =
    glassTokens.length > 0 ? `Glass: ${glassTokens.join(" + ")}` : "";

  // 4) Opciones
  const optionsLine = [
    `Screen: ${piece.screen ? "Yes" : "No"}`,
    `Muntin: ${piece.muntin ? "Yes" : "No"}`,
    `Privacy: ${piece.privacy ? "Yes" : "No"}`,
  ].join(" | ");

  // 5) PSF (si la pieza tiene los campos)
  const pos = (piece as any).dpPosPsf;
  const neg = (piece as any).dpNegPsf;
  const psfLine =
    pos != null && neg != null
      ? `PSF: ${formatPsf(pos)} ${formatPsf(neg)}`
      : "";

  return [header, sizeLine, glassLine, optionsLine, psfLine].filter(
    (l) => l && l.trim() !== ""
  );
}

// Helper visual para no repetir JSX en las tablas
function PieceDescriptionCell({ piece }: { piece: PieceWithRelations }) {
  const lines = buildPieceDescriptionLines(piece);
  return (
    <>
      {lines.map((line, idx) => (
        <p
          key={idx}
          className={
            idx === 0
              ? "font-semibold text-gray-800"
              : "text-gray-600 text-xs mt-1"
          }
        >
          {line}
        </p>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// BLOQUES DE CONTENIDO (vistas internas)
// ─────────────────────────────────────────────

const ClientContent = ({ estimate }: { estimate: EstimateWithRelations }) => (
  <>
    <section className="mt-10">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Detalle de Piezas
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Mark</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-center">Cant.</th>
              <th className="px-4 py-3 text-right">Precio Unit.</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {estimate.pieces.map((piece) => {
              const unitPrice = Number(piece.price) || 0;
              const subtotal = unitPrice * (piece.qty || 0);
              return (
                <tr key={piece.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4 font-medium">{piece.mark}</td>
                  <td className="px-4 py-4">
                    <PieceDescriptionCell piece={piece} />
                  </td>
                  <td className="px-4 py-4 text-center">{piece.qty}</td>
                  <td className="px-4 py-4 text-right">
                    {formatCurrency(unitPrice)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>

    <section className="flex justify-end mt-10">
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-gray-800">
            {formatCurrency(estimate.priceT)}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-600">
            Sales Tax ({(Number(estimate.taxRate) * 100).toFixed(2)}%)
          </span>
          <span className="font-medium text-gray-800">
            {formatCurrency(estimate.taxAmount)}
          </span>
        </div>
        <div className="flex justify-between py-3 border-t-2 mt-2">
          <span className="text-lg font-bold text-gray-900">
            Total a Pagar:
          </span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(estimate.totalPayable)}
          </span>
        </div>
      </div>
    </section>
  </>
);

const DealerInternalContent = ({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) => (
  <>
    <ClientContent estimate={estimate} />

    <section className="mt-10 p-6 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold text-green-800 mb-4">
        Resumen para Dealer
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total a Pagar a Impact Plus:</span>
          <span className="font-medium">
            {formatCurrency(estimate.totalPayable)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Precio Final para tu Cliente:</span>
          <span className="font-medium">{formatCurrency(estimate.total)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-green-700 pt-2 border-t">
          <span>Tu Ganancia (Net Profit):</span>
          <span>{formatCurrency(estimate.netProfitD)}</span>
        </div>
      </div>
    </section>
  </>
);

const AdminContent = ({ estimate }: { estimate: EstimateWithRelations }) => (
  <>
    <DealerInternalContent estimate={estimate} />

    <section className="mt-10 p-6 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-4">
        Resumen para Admin
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">
            Costo Total de Producción (Rate):
          </span>
          <span className="font-medium">{formatCurrency(estimate.rateT)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">
            Precio de Venta (Sin Impuestos):
          </span>
          <span className="font-medium">{formatCurrency(estimate.priceT)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-red-700 pt-2 border-t">
          <span>Ganancia de Impact Plus (Net Profit):</span>
          <span>{formatCurrency(estimate.netProfit)}</span>
        </div>
      </div>
    </section>
  </>
);

// ─────────────────────────────────────────────
// VISTA PÚBLICA (exportada también al servidor)
// ─────────────────────────────────────────────

export const DealerPublicView = ({
  estimate,
}: {
  estimate: EstimateWithRelations;
}) => (
  <div className="bg-white rounded-lg shadow-md p-6 sm:p-10 font-sans">
    <header className="flex justify-between items-start pb-6 border-b">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Presupuesto</h1>
        <p className="text-gray-500 mt-1">Número: {estimate.number}</p>
      </div>
      <div className="text-right">
        <h2 className="text-xl font-semibold text-gray-700">Impact Plus</h2>
        <p className="text-sm text-gray-500">123 Main Street, Miami, FL</p>
        <p className="text-sm text-gray-500">sales@impactplus.com</p>
      </div>
    </header>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Preparado para
        </h3>
        <p className="font-medium text-gray-800 text-lg">{estimate.name}</p>
      </div>
      <div className="md:text-right">
        <p className="text-sm text-gray-500 mt-1">
          Fecha: {formatDate(estimate.date)}
        </p>
      </div>
    </section>

    <section className="mt-10">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Detalle de Piezas
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Mark</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-center">Cant.</th>
              <th className="px-4 py-3 text-right">Precio Unit.</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {estimate.pieces.map((piece) => {
              const unitPrice = Number(piece.price) || 0; // precio unitario
              const subtotal = unitPrice * (piece.qty || 0); // unitPrice * qty

              return (
                <tr key={piece.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4 font-medium">{piece.mark}</td>

                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-800">
                      {piece.prod.name} - {piece.bran.name}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      {piece.syst.name}, {piece.conf.conf}, {piece.width}x
                      {piece.height}, Color: {piece.fColor.color}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-center">{piece.qty}</td>

                  <td className="px-4 py-4 text-right">
                    {formatCurrency(unitPrice)}
                  </td>

                  <td className="px-4 py-4 text-right font-medium">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>

    <section className="flex justify-end mt-10">
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between py-3 border-t-2 mt-2">
          <span className="text-lg font-bold text-gray-900">Total:</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(estimate.total)}
          </span>
        </div>
      </div>
    </section>

    <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
      <p>Gracias por su negocio. Este presupuesto es válido por 30 días.</p>
    </footer>
  </div>
);

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL (vista interna / admin)
// ─────────────────────────────────────────────

export function EstimateDetailsClient({
  estimate,
  userRole,
}: {
  estimate: EstimateWithRelations;
  userRole: string;
}) {
  const router = useRouter();
  const [isPublicView, setIsPublicView] = useState(false);
  const isDealer = userRole === "dealer";

  const handlePrint = () => window.print();
  const publicLink =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?view=public`
      : "";

  const renderContent = () => {
    switch (userRole) {
      case "admin":
        return <AdminContent estimate={estimate} />;
      case "dealer":
        return <DealerInternalContent estimate={estimate} />;
      case "client":
        return <ClientContent estimate={estimate} />;
      default:
        return <ClientContent estimate={estimate} />;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>

          {isDealer && (
            <Button
              variant="ghost"
              onClick={() => setIsPublicView(!isPublicView)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {isPublicView ? "Ver mi reporte" : "Vista para mi cliente"}
            </Button>
          )}

          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>

        {isDealer && isPublicView && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm print:hidden">
            <p>
              Estás viendo el reporte para tu cliente.{" "}
              <a
                href={publicLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                Abre este link en una nueva pestaña
              </a>{" "}
              para compartirlo.
            </p>
          </div>
        )}

        <div
          id="printable-area"
          className="bg-white rounded-lg shadow-md p-6 sm:p-10 font-sans"
        >
          <header className="flex justify-between items-start pb-6 border-b">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Presupuesto</h1>
              <p className="text-gray-500 mt-1">Número: {estimate.number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-gray-700">
                Impact Plus
              </h2>
              <p className="text-sm text-gray-500">
                123 Main Street, Miami, FL
              </p>
              <p className="text-sm text-gray-500">sales@impactplus.com</p>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Preparado para
              </h3>
              <p className="font-medium text-gray-800 text-lg">
                {estimate.name}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-gray-500 mt-1">
                Fecha: {formatDate(estimate.date)}
              </p>
            </div>
          </section>

          {isDealer && isPublicView ? (
            // cuando es vista pública desde el dealer, reusamos el mismo layout
            <DealerPublicView estimate={estimate} />
          ) : (
            renderContent()
          )}

          <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
            <p>
              Gracias por su negocio. Este presupuesto es válido por 30 días.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
