import { Order, OrderWithRelations, UpdateOrderData, OrderStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Esta función ya la tienes, la dejamos como está.
export async function createOrder(estimateId: number): Promise<Order> {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estimateId }),
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create order');
  }
  return response.json();
}

// Obtener todas las órdenes (con token para SSR)
export async function getOrders(token?: string): Promise<OrderWithRelations[]> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  const res = await fetch(`${API_URL}/api/orders`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

// Obtener una sola orden por su ID
export async function getOrder(id: number, token?: string): Promise<OrderWithRelations> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Cookie'] = `access_token=${token}`;
  }
  const res = await fetch(`${API_URL}/api/orders/${id}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
}

// Actualizar una orden (principalmente el estado)
export async function updateOrder(id: number, data: UpdateOrderData): Promise<OrderWithRelations> {
  const res = await fetch(`${API_URL}/api/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update order');
  }
  return res.json();
}

export async function getOrderStatuses(token?: string): Promise<OrderStatus[]> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Cookie'] = `access_token=${token}`;
    }
    const res = await fetch(`${API_URL}/api/orders/statuses`, { 
        cache: "no-store",
        headers,
    });
    if (!res.ok) throw new Error("Failed to fetch order statuses");
    return res.json();
}