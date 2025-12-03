import { apiFetch } from './_base';
import type { Notification } from './types';

/**
 * Obtiene todas las notificaciones del usuario autenticado.
 */
export function getNotifications() {
  return apiFetch<Notification[]>('/api/notifications');
}

/**
 * Marca una notificación como leída.
 */
export function markNotificationAsRead(id: number) {
  return apiFetch<Notification>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

/**
 * Elimina una notificación específica por ID.
 */
export function deleteNotification(id: number) {
  return apiFetch<{ message: string }>(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Elimina todas las notificaciones del usuario autenticado.
 */
export function deleteAllNotifications() {
  return apiFetch<{ count: number }>('/api/notifications/clear-all', {
    method: 'DELETE',
  });
}
