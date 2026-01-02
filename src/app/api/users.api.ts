// src/app/api/users.api.ts
import { apiFetch } from "./_base";
import type { User, CreateUserDto, UpdateUserDto } from "./types";

/**
 * Obtiene todos los usuarios (SSR opcional con token).
 */
export function getUsers() {
  return apiFetch<User[]>("/api/users");
}

/**
 * Obtiene un usuario por ID (SSR opcional con token). 
 */
export function getUser(id: number) {
  return apiFetch<User>(`/api/users/${id}`);
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

/**
 * Elimina un usuario (admin-only).
 * Tu backend devuelve el usuario eliminado (no void).
 */
export function deleteUser(id: number) {
  return apiFetch<User>(`/api/users/${id}`, {
    method: "DELETE",
  });
}
