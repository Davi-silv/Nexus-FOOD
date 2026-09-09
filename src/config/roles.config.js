/**
 * Perfis e permissões do Nexus Food.
 *
 * Hierarquia:
 * - platform_super_admin → Evolutiva Tech (nunca mistura tenants)
 * - company_admin → dono/gestor do restaurante
 * - employee → permissões configuráveis por módulo
 */

export const ROLES = {
  PLATFORM_SUPER_ADMIN: 'platform_super_admin',
  COMPANY_ADMIN: 'company_admin',
  EMPLOYEE: 'employee',
};

/** Módulos com permissão granular para funcionários */
export const PERMISSION_MODULES = [
  'dashboard',
  'products',
  'ingredients',
  'recipes',
  'inventory',
  'purchases',
  'suppliers',
  'waste',
  'sales',
  'finance',
  'reports',
  'users',
  'settings',
];

export const DEFAULT_EMPLOYEE_PERMISSIONS = {
  dashboard: true,
  products: false,
  ingredients: true,
  recipes: false,
  inventory: true,
  purchases: false,
  suppliers: false,
  waste: true,
  sales: true,
  finance: false,
  reports: false,
  users: false,
  settings: false,
};

export function isPlatformAdmin(role) {
  return role === ROLES.PLATFORM_SUPER_ADMIN;
}

export function isCompanyAdmin(role) {
  return role === ROLES.COMPANY_ADMIN;
}

/**
 * @param {string} role
 * @param {Record<string, boolean>} [permissions]
 * @param {string} moduleKey
 */
export function canAccessModule(role, permissions, moduleKey) {
  if (isPlatformAdmin(role)) return true;
  if (isCompanyAdmin(role)) return true;
  return Boolean(permissions?.[moduleKey]);
}
