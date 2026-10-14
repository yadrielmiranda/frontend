import type { TechnicianCustomerDeliveryPo } from "@/app/api/technician.api";
import type { CustomerDeliveryRequest } from "@/app/api/warehouse.api";
import type { SignatureStrokes } from "@/app/api/contracts.api";
import type { CustomerDeliveryPreview } from "@/app/warehouse/customer-deliveries/customer-delivery-receipt";
import { hasDeliverySignature, MAX_DELIVERY_PIECES } from "@/app/warehouse/customer-deliveries/customer-delivery-selection";

export type TechnicianPoSelection = Record<string, TechnicianCustomerDeliveryPo>;
export const pendingCustomerDeliveryKey = (actorId: number) => `technician-customer-delivery:${actorId}`;

export function selectedCustomerDeliveryLines(selection: TechnicianPoSelection) {
  const lines = Object.values(selection).flatMap(po => po.lines);
  if (!lines.length || lines.length > MAX_DELIVERY_PIECES) throw new Error(`Select POs with between 1 and ${MAX_DELIVERY_PIECES} pieces.`);
  const seen = new Set<string>();
  for (const line of lines) {
    if (!Number.isInteger(line.inTransit) || line.inTransit < 1 || line.inTransit > 200 || !Number.isSafeInteger(line.version) || line.version < 0)
      throw new Error("The available parts changed. Refresh and select the PO again.");
    if (seen.has(line.lineNumber)) throw new Error("A piece is included more than once. Refresh and select the PO again.");
    seen.add(line.lineNumber);
  }
  return lines.sort((a, b) => a.lineNumber.localeCompare(b.lineNumber));
}

export function technicianCustomerDeliveryPreview(selection: TechnicianPoSelection, firstName: string, lastName: string, signatureStrokes: SignatureStrokes): CustomerDeliveryPreview {
  const lines = Object.values(selection).flatMap(po => po.lines).sort((a, b) => a.lineNumber.localeCompare(b.lineNumber));
  return {
    source: "TRANSIT", storeId: null, storeName: null, firstName: firstName.trim(), lastName: lastName.trim(), signatureStrokes,
    items: lines.map(line => ({
      lineNumber: line.lineNumber, barcode: line.barcode, poNumber: line.poNumber, source: line.source,
      orderNumber: line.orderNumber, mark: line.mark, description: line.description,
      product: line.product, system: line.system, configuration: line.configuration, quantity: line.inTransit,
    })),
    totalPieces: lines.length, totalParts: lines.reduce((sum, line) => sum + line.inTransit, 0),
  };
}

export function technicianCustomerDeliveryRequest(selection: TechnicianPoSelection, firstName: string, lastName: string, signatureStrokes: SignatureStrokes, requestKey: string): CustomerDeliveryRequest {
  const first = firstName.trim().replace(/\s+/g, " "), last = lastName.trim().replace(/\s+/g, " ");
  if (!first || !last || first.length > 100 || last.length > 100 || /[\x00-\x1f\x7f]/.test(first + last)) throw new Error("Enter the recipient's first and last name.");
  if (!hasDeliverySignature(signatureStrokes)) throw new Error("Ask the recipient to sign the receipt.");
  return {
    requestKey, source: "TRANSIT", firstName: first, lastName: last, signatureStrokes,
    items: selectedCustomerDeliveryLines(selection).map(line => ({ barcode: line.barcode, version: line.version, quantity: line.inTransit })),
  };
}
