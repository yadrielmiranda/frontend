import { apiFetch } from "../../_base";
import type { CreateUserDto, User, UpdateUserDto } from "../../../../lib/types";

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

// =======================
// AUTH
// =======================

/**
 * Login: guarda cookie httpOnly access_token (el backend la setea).
 */
export function loginUser(userData: LoginData) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: userData,
  });
}

/**
 * Logout: invalida la sesión (backend borra cookie).
 */
export function logoutUser() {
  return apiFetch<LogoutResponse>("/api/auth/logout", {
    method: "POST",
  });
}

/**
 * Profile normal: si es 401 en cliente, dispara auth:login-required (modal).
 */
export function getProfile() {
  return apiFetch<User>("/api/auth/profile");
}

/**
 * ✅ Profile silencioso: NO dispara el modal si es 401.
 * Úsalo en el load inicial (landing) para que NO abra login automáticamente.
 */
export function getProfileSilent() {
  return apiFetch<User>("/api/auth/profile", {
    suppressAuthEvent: true,
  });
}

export function updateMyProfile(userData: Omit<UpdateUserDto, "idRole">) {
  return apiFetch<User>("/api/auth/profile", {
    method: "PATCH",
    body: userData,
  });
}

/**
 * Cambiar contraseña del usuario autenticado.
 */
export function changePassword(data: ChangePasswordData) {
  return apiFetch<{ message: string }>("/api/auth/change-password", {
    method: "PATCH",
    body: data,
  });
}

/**
 * Signup público (si lo usas)
 */
type RegisterUserData = Omit<CreateUserDto, "idRole">;

export function registerUser(userData: RegisterUserData) {
  return apiFetch<User>("/api/auth/register", {
    method: "POST",
    body: userData,
  });
}
