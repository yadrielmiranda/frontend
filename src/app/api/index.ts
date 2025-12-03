// src/app/api/index.ts

// utilidades base
export * from './_base';

// módulos API (cliente)
export * from './brands.api';
export * from './coatings.api';
export * from './configs.api';
export * from './crystals.api';
export * from './dimension-policies.api';
export * from './estimates.api';
export * from './fcolors.api';
export * from './global-parameters.api';
export * from './notifications.api';
export * from './orders.api';
export * from './pricing-rules.api';
export * from './products.api';
export * from './roles.api';
export * from './systems.api';
export * from './tints.api';
export * from './users.api';

// auth (cliente)
// ⚠️ NO re-exportes route handlers (route.ts). Solo el wrapper de cliente:
export * from './auth/me/auth.api';


