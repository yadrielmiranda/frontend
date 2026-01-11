export type RoleName = "admin" | "operator" | "dealer" | "client";

export const canAccessSettings = (role?: RoleName | string | null) =>
  role === "admin" || role === "operator";

export const canEditOrders = (role?: RoleName | string | null) =>
  role === "admin" || role === "operator";

export const canEditSettings = (role?: RoleName | string | null) =>
  role === "admin"; // operator solo lectura

export const isAdmin = (role?: RoleName | string | null) => role === "admin";
export const isOperator = (role?: RoleName | string | null) => role === "operator";
export const isDealer = (role?: RoleName | string | null) => role === "dealer";
export const isClient = (role?: RoleName | string | null) => role === "client";