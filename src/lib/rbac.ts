export type RoleName = "admin" | "operator" | "dealer" | "client";

export const canAccessSettings = (role?: RoleName | string | null) =>
  role === "admin" || role === "operator";

export const canEditOrders = (role?: RoleName | string | null) =>
  role === "admin" || role === "operator";

export const canViewOrderFinancials = (role?: RoleName | string | null) =>
  role === "admin" || role === "operator";

export const canEditSettings = (role?: RoleName | string | null) =>
  role === "admin"; // operator solo lectura

export const canSetCustomerOnEstimate = (role?: RoleName | string | null) => // admin, operator, dealer pueden hacerlo
  role === "admin" || role === "operator" || role === "dealer";


export const isAdminRole = (role?: RoleName | string | null) => role === "admin";
export const isOperatorRole = (role?: RoleName | string | null) => role === "operator";
export const isDealerRole = (role?: RoleName | string | null) => role === "dealer";
export const isClientRole = (role?: RoleName | string | null) => role === "client";