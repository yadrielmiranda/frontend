import { Notification } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getNotifications(): Promise<Notification[]> {
  const response = await fetch(`${API_URL}/api/notifications`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

export async function markNotificationAsRead(id: number): Promise<Notification> {
  const response = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  return response.json();
}

export async function deleteNotification(id: number): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/notifications/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete notification');
  }
  return response.json();
}

export async function deleteAllNotifications(): Promise<{ count: number }> {
  const response = await fetch(`${API_URL}/api/notifications/clear-all`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete all notifications');
  }
  return response.json();
}