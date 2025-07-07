"use client";

import { Button } from "@/components/ui/button";
import { EstimateWithRelations } from "@/app/api/types";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";

// Funciones auxiliares para formatear los datos
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
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

// Componente del lado del cliente para manejar la interactividad
export function EstimateDetailsClient({ estimate }: { estimate: EstimateWithRelations }) {
  const router = useRouter();

  // Función que invoca la ventana de impresión del navegador
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* --- Barra de Acciones (se oculta al imprimir) --- */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir / Guardar PDF
          </Button>
        </div>

        {/* --- Área Imprimible --- */}
        <div id="printable-area" className="bg-white rounded-lg shadow-md p-6 sm:p-10 font-sans">
          
          <header className="flex justify-between items-start pb-6 border-b">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Presupuesto</h1>
              <p className="text-gray-500 mt-1">Número: {estimate.number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-gray-700">Impact Plus</h2>
              <p className="text-sm text-gray-500">Tu Dirección, Ciudad</p>
              <p className="text-sm text-gray-500">tuemail@impactplus.com</p>
              <p className="text-sm text-gray-500">(123) 456-7890</p>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Preparado para</h3>
              <p className="font-medium text-gray-800 text-lg">{estimate.name}</p>
            </div>
            <div className="md:text-right">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Proyecto</h3>
              <p className="font-medium text-gray-800">{estimate.project}</p>
              <p className="text-sm text-gray-500 mt-1">Fecha: {formatDate(estimate.date)}</p>
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle de Piezas</h3>
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
                  {estimate.pieces.map((piece) => (
                    <tr key={piece.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium">{piece.mark}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">{piece.prod.name} - {piece.bran.name}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {piece.syst.name}, {piece.conf.conf}, {piece.width}x{piece.height}, Color: {piece.fColor.color}, Cristal: {piece.cryst.glass}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">{piece.qty}</td>
                      <td className="px-4 py-4 text-right">{formatCurrency(piece.price)}</td>
                      <td className="px-4 py-4 text-right font-medium">{formatCurrency(piece.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex justify-end mt-10">
            <div className="w-full max-w-xs">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-800">{formatCurrency(estimate.priceT)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 mt-2">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(estimate.priceT)}</span>
              </div>
            </div>
          </section>

          <footer className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
            <p>Gracias por su negocio.</p>
            <p>Este presupuesto es válido por 30 días.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
