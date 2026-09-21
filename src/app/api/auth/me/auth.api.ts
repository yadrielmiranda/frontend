import { apiFetch } from "../../_base";
import { userView, type ApiUser } from "@/lib/user-view";
import type { CreateUserDto, User, UpdateUserDto } from "../../../../lib/types";

// --- Tipos auxiliares de auth ---
export interface LoginData {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  message?: string;
  role?: string;
}

export interface LogoutResponse {
  message?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;  
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
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
  return apiFetch<ApiUser>("/api/auth/profile").then(userView);
}

/**
 * ✅ Profile silencioso: NO dispara el modal si es 401.
 * Úsalo en el load inicial (landing) para que NO abra login automáticamente.
 */
export function getProfileSilent() {
  return apiFetch<ApiUser>("/api/auth/profile", {
    suppressAuthEvent: true,
  }).then(userView);
}

type ProfileFields = "username" | "firstName" | "lastName" | "email" | "phone" |
  "street" | "city" | "state" | "postalCode";

export function updateMyProfile(userData: Pick<UpdateUserDto, ProfileFields>) {
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
 * Solicita un link para recuperar contraseña.
 */
export function forgotPassword(data: ForgotPasswordData) {
  return apiFetch<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: data,
    suppressAuthEvent: true,
  });
}

/**
 * Cambia la contraseña usando el token recibido por email.
 */
export function resetPassword(data: ResetPasswordData) {
  return apiFetch<ResetPasswordResponse>("/api/auth/reset-password", {
    method: "POST",
    body: data,
    suppressAuthEvent: true,
  });
}

/**
 * Signup público (si lo usas)
 */
type RegisterUserData = Pick<CreateUserDto, ProfileFields | "password"> & {
  platformTermsAccepted?: boolean;
  platformTermsVersionId?: number;
  serviceConsent: boolean;
  promotionsConsent: boolean;
  consentVersion?: string;
};

export function registerUser(userData: RegisterUserData) {
  return apiFetch<User>("/api/auth/register", {
    method: "POST",
    body: userData,
  });
}
