import { beforeEach, describe, expect, it } from 'vitest';
import { canAccessModule, ROLES } from '@/config/roles.config.js';
import {
  assertCanActivateCompany,
  assertCompanyScope,
  beginSupportTenantAccess,
  clearSupportTenantAccess,
  filterByCompany,
  requireCompanyAccess,
} from '@/services/company.service.js';
import { clearSession, login, logout } from '@/services/auth.service.js';
import { listIngredients, createIngredient, resetIngredients } from '@/services/ingredients.service.js';
import { DEMO_COMPANY, DEMO_USERS } from '@/data/demo.js';
import { listPlatformCompanies } from '@/services/platform.service.js';
import { STORAGE_KEYS } from '@/core/constants.js';

describe('multiempresa / permissões', () => {
  it('admin acessa financeiro; funcionário sem permissão não', () => {
    expect(canAccessModule(ROLES.COMPANY_ADMIN, {}, 'finance')).toBe(true);
    expect(canAccessModule(ROLES.EMPLOYEE, { finance: false }, 'finance')).toBe(false);
    expect(canAccessModule(ROLES.EMPLOYEE, { inventory: true }, 'inventory')).toBe(true);
  });

  it('filtra registros por company_id', () => {
    const rows = [
      { id: 1, companyId: 'A' },
      { id: 2, companyId: 'B' },
      { id: 3, company_id: 'A' },
    ];
    expect(filterByCompany(rows, 'A')).toHaveLength(2);
    expect(filterByCompany(rows, 'B')).toHaveLength(1);
  });

  it('bloqueia acesso cross-company', () => {
    expect(() => assertCompanyScope('A', 'B')).toThrow(/outra empresa/);
  });
});

describe('multiempresa · amarração à sessão', () => {
  const OTHER = 'company_tenant_b_isolation';

  beforeEach(() => {
    clearSupportTenantAccess();
    clearSession();
    localStorage.clear();
    resetIngredients(DEMO_COMPANY.id);
    resetIngredients(OTHER);
  });

  it('com sessão, impede ler/gravar outra empresa', async () => {
    await login({ email: DEMO_USERS.admin.email, password: DEMO_USERS.admin.password });

    expect(() => requireCompanyAccess(OTHER)).toThrow(/outra empresa/);
    expect(() => listIngredients(OTHER)).toThrow(/outra empresa/);
    expect(() =>
      createIngredient(OTHER, {
        name: 'Hack',
        unit: 'kg',
        quantity: 1,
        minStock: 1,
        currentCost: 10,
      }),
    ).toThrow(/outra empresa/);

    expect(listIngredients(DEMO_COMPANY.id).length).toBeGreaterThan(0);
  });

  it('setActiveCompany não troca tenant de restaurante', async () => {
    await login({ email: DEMO_USERS.admin.email, password: DEMO_USERS.admin.password });
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
    expect(() =>
      assertCanActivateCompany(user, { id: OTHER, tradeName: 'Invasora' }),
    ).toThrow(/alternar|outra empresa/i);
  });

  it('plataforma sem suporte não acessa dados do restaurante', async () => {
    await login({
      email: DEMO_USERS.superAdmin.email,
      password: DEMO_USERS.superAdmin.password,
    });
    expect(() => listIngredients(DEMO_COMPANY.id)).toThrow(/modo suporte/i);
    expect(() => listPlatformCompanies()).not.toThrow();
  });

  it('modo suporte libera apenas a empresa auditada', async () => {
    await login({
      email: DEMO_USERS.superAdmin.email,
      password: DEMO_USERS.superAdmin.password,
    });
    beginSupportTenantAccess({
      companyId: DEMO_COMPANY.id,
      reason: 'Cliente reportou CMV',
      adminUserId: DEMO_USERS.superAdmin.id,
      adminName: DEMO_USERS.superAdmin.name,
    });
    expect(listIngredients(DEMO_COMPANY.id).length).toBeGreaterThan(0);
    expect(() => listIngredients(OTHER)).toThrow(/modo suporte/i);

    clearSupportTenantAccess();
    expect(() => listIngredients(DEMO_COMPANY.id)).toThrow(/modo suporte/i);
  });

  it('logout remove sessão e contexto de suporte', async () => {
    await login({
      email: DEMO_USERS.superAdmin.email,
      password: DEMO_USERS.superAdmin.password,
    });
    beginSupportTenantAccess({
      companyId: DEMO_COMPANY.id,
      reason: 'Auditoria de estoque',
      adminUserId: DEMO_USERS.superAdmin.id,
    });
    await logout();
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
    expect(() =>
      beginSupportTenantAccess({
        companyId: DEMO_COMPANY.id,
        reason: 'sem sessão',
      }),
    ).toThrow(/plataforma/i);
  });
});
