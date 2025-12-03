import { apiFetch } from './_base';
import type { Order, OrderWithRelations, UpdateOrderData, OrderStatus } from './types';

/**
 * Crea una orden a partir de un estimateId.
 */
export function createOrder(estimateId: number) {
  return apiFetch<Order>('/api/orders', {
    method: 'POST',
    body: { estimateId },
  });
}

/**
 * Obtiene todas las órdenes (SSR opcional con token).
 */
export function getOrders(token?: string) {
  return apiFetch<OrderWithRelations[]>('/api/orders', { token });
}

/**
 * Obtiene una sola orden por su ID (SSR opcional con token).
 */
export function getOrder(id: number, token?: string) {
  return apiFetch<OrderWithRelations>(`/api/orders/${id}`, { token });
}

/**
 * Actualiza una orden (principalmente el estado).
 */
export function updateOrder(id: number, data: UpdateOrderData) {
  return apiFetch<OrderWithRelations>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Obtiene los posibles estados de una orden (SSR opcional con token).
 */
export function getOrderStatuses(token?: string) {
  return apiFetch<OrderStatus[]>('/api/orders/statuses', { token });
}
