import type { CompanyLocale } from "@/components/company/company-content";

const spanish = {
  "Loading...": "Cargando...",
  "My Estimates": "Mis cotizaciones",
  "Active Estimates": "Cotizaciones activas",
  "Ready to manage": "Listas para revisar",
  "My Orders": "Mis órdenes",
  "Orders": "Órdenes",
  "Total orders": "Total de órdenes",
  "Pending PO": "Órdenes pendientes de PO de fábrica",
  "Awaiting factory PO": "A la espera del número de PO",
  "Estimates Value": "Valor de las cotizaciones",
  "Active + signed estimates": "Cotizaciones activas y firmadas",
  "View My Estimates": "Ver mis cotizaciones",
  "Estimates": "Cotizaciones",
  "Review your available estimates": "Revisa tus cotizaciones disponibles",
  "Create and manage quotes": "Crea y administra cotizaciones",
  "Track your orders": "Consulta el estado de tus órdenes",
  "View and manage orders": "Consulta y administra las órdenes",
  "My Branding": "Mi marca",
  "Manage your dealer branding": "Administra la imagen de tu marca",
  "Profile": "Perfil",
  "Update your account information": "Actualiza los datos de tu cuenta",
  "Pricing Rules": "Reglas de precios",
  "Manage pricing configuration": "Administra la configuración de precios",
  "Dimension Policies": "Reglas de dimensiones",
  "Review size and pressure rules": "Consulta las reglas de dimensiones y presión",
  "Users": "Usuarios",
  "Manage system users": "Administra los usuarios del sistema",
  "System Settings": "Configuración del sistema",
  "Review system configuration": "Consulta la configuración del sistema",
  "Manage products, systems, and options": "Administra los productos, sistemas y opciones",
  "Review your estimates, track orders, and manage your account information.":
    "Revisa tus cotizaciones, sigue tus órdenes y actualiza los datos de tu cuenta.",
  "Manage estimates, orders, customer quotes, and your dealer branding.":
    "Administra tus cotizaciones y órdenes, prepara cotizaciones para tus clientes y personaliza tu marca.",
  "Manage estimates, orders, customer access, pricing rules, and system tools.":
    "Administra las cotizaciones, las órdenes, el acceso de los clientes, las reglas de precios y las herramientas del sistema.",
  "Go to Estimates": "Ir a cotizaciones",
  "Shop materials": "Comprar materiales",
  "Could not load dashboard data. Please try again.": "No se pudieron cargar los datos del panel. Vuelve a intentarlo.",
  "Quick Actions": "Accesos rápidos",
  "Shortcuts based on your role and permissions.": "Opciones disponibles según tu rol y tus permisos.",
};

export function dashboardText(locale: CompanyLocale, label: keyof typeof spanish) {
  return locale === "es" ? spanish[label] : label;
}

export function dashboardGreeting(locale: CompanyLocale, name?: string) {
  if (locale === "es") return name ? `¡Hola de nuevo, ${name}!` : "¡Hola de nuevo!";
  return name ? `Welcome back, ${name}!` : "Welcome back!";
}

const spanishWorkspaces = new Map([
  ["admin", "Panel de administración"], ["operator", "Panel de operador"],
  ["client", "Panel de cliente"], ["dealer", "Panel de distribuidor"], ["technician", "Panel de técnico"],
]);

export function dashboardWorkspace(locale: CompanyLocale, role?: string) {
  if (locale === "en") return role ? `${role} workspace` : "workspace";
  if (!role) return "Panel";
  return spanishWorkspaces.get(role) ?? `Panel · ${role}`;
}
