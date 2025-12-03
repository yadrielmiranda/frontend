import { apiFetch } from './_base';
import type { User, Role, CreateUserDto, UpdateUserDto } from '@/app/api/types';

// --- Tipos auxiliares de auth ---
export interface LoginData {
  identifier: string;
  password: string;
}
export interface LoginResponse {
  message?: string;
}
export interface LogoutResponse {
  message?: string;
}
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// --- CRUD de Usuarios (panel admin) ---

/**
 * Obtiene todos los usuarios (SSR opcional con token).
 */
export function getUsers(token?: string) {
  return apiFetch<User[]>('/api/users', { token });
}

/**
 * Obtiene un usuario por ID (SSR opcional con token).
 */
export function getUser(id: number, token?: string) {
  return apiFetch<User>(`/api/users/${id}`, { token });
}

/**
 * Crea un usuario (cliente: usa cookies con credentials incluido por defecto).
 */
export function createUser(userData: CreateUserDto) {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: userData,
  });
}

/**
 * Actualiza un usuario.
 */
export function updateUser(id: number, userData: UpdateUserDto) {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PATCH',
    body: userData,
  });
}

/**
 * Elimina un usuario.
 */
export function deleteUser(id: number) {
  return apiFetch<void>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

// --- Autenticación / Perfil ---

/**
 * Login (devuelve mensaje opcional). Las cookies de sesión quedan guardadas en el navegador.
 */
export function loginUser(userData: LoginData) {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: userData,
  });
}

/**
 * Logout (invalida la sesión del usuario actual).
 */
export function logoutUser() {
  return apiFetch<LogoutResponse>('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Actualiza el perfil del usuario autenticado (sin cambiar el rol).
 */
export function updateMyProfile(userData: Omit<UpdateUserDto, 'idRole'>) {
  return apiFetch<User>('/api/auth/profile', {
    method: 'PATCH',
    body: userData,
  });
}

/**
 * Cambia la contraseña del usuario autenticado.
 */
export function changePassword(data: ChangePasswordData) {
  return apiFetch<{ message: string }>('/api/auth/change-password', {
    method: 'PATCH',
    body: data,
  });
}
