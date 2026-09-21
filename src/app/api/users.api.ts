// src/app/api/users.api.ts
import { apiFetch } from "./_base";
import { userView, type ApiUser } from "@/lib/user-view";
import type { User, CreateUserDto, UpdateUserDto } from "../../lib/types";

/**
 * Obtiene todos los usuarios (SSR opcional con token).
 */
export function getUsers(includeDeleted = false) {
  return apiFetch<ApiUser[]>(
    `/api/users?includeDeleted=${includeDeleted}`,
  ).then((users) => users.map(userView));
}

/**
 * Obtiene un usuario por ID (SSR opcional con token). 
 */
export function getUser(id: number) {
  return apiFetch<ApiUser>(`/api/users/${id}`).then(userView);
}

/**
 * Crea un usuario (admin-only).
 */
export function createUser(userData: CreateUserDto) {
  return apiFetch<User>("/api/users", {
    method: "POST",
    body: userData,
  });
}

/**
 * Actualiza un usuario (admin-only).
 */
export function updateUser(id: number, userData: UpdateUserDto) {
  return apiFetch<User>(`/api/users/${id}`, {
    method: "PATCH",
    body: userData,
  });
}

export function setUserActive(id: number, isActive: boolean) {
  return apiFetch<User>(`/api/users/${id}/active`, {
    method: "PATCH",
    body: { isActive },
  });
}

/**
 * Elimina un usuario (admin-only).
 * El backend devuelve el usuario eliminado (no void).
 */
export function deleteUser(id: number) {
  return apiFetch<User>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

/**
 * Elimina la cuenta del usuario autenticado.
 */
export function deleteMyAccount() {
  return apiFetch<User>("/api/users/me", {
    method: "DELETE",
  });
}

export type TechnicianAccountData = {
  firstName: string; lastName: string; username: string; password: string;
};

export const createTechnician = (data: TechnicianAccountData) =>
  apiFetch<ApiUser>("/api/users/technicians", { method: "POST", body: data }).then(userView);

export const updateTechnician = (id: number, data: Partial<TechnicianAccountData>) =>
  apiFetch<ApiUser>(`/api/users/technicians/${id}`, { method: "PATCH", body: data }).then(userView);
