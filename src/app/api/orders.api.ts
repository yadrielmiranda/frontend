import { apiFetch } from "./_base";
import type {
  OrderExtraCharge,
  OrderWithRelations,
  UpdateOrderData,
  OrderStatus,
} from "../../lib/types";

/**
 * Obtiene todas las órdenes (SSR opcional con token).
 */
export function getOrders() {
  return apiFetch<OrderWithRelations[]>("/api/orders");
}

/**
 * Obtiene una sola orden por su ID (SSR opcional con token).
 */
export function getOrder(id: number) {
  return apiFetch<OrderWithRelations>(`/api/orders/${id}`);
}

/**
 * Actualiza una orden (principalmente el estado).
 */
export function updateOrder(id: number, data: UpdateOrderData) {
  return apiFetch<OrderWithRelations>(`/api/orders/${id}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * Obtiene los posibles estados de una orden (SSR opcional con token).
 */
export function getOrderStatuses() {
  return apiFetch<OrderStatus[]>("/api/orders/statuses");
}

export type CreateOrderExtraChargeInput = {
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxable?: boolean;
  }>;
};

export function createOrderExtraCharge(
  orderId: number,
  data: CreateOrderExtraChargeInput,
) {
  return apiFetch<OrderExtraCharge>(`/api/orders/${orderId}/extra-charges`, {
    method: "POST",
    body: data,
  });
}

export function respondOrderExtraCharge(
  chargeId: number,
  decision: "APPROVE" | "REJECT",
  comment?: string,
) {
  return apiFetch<OrderExtraCharge>(
    `/api/orders/extra-charges/${chargeId}/respond`,
    {
      method: "POST",
      body: { decision, comment },
    },
  );
}
