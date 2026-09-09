/**
 * Smoke runtime fora do Vitest — valida login e módulos críticos.
 * Uso: node --experimental-vm-modules node_modules/vitest/vitest.mjs run src/tests/smoke.runtime.test.js
 * (incluído na suíte via vitest)
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { login, logout } from '@/services/auth.service.js';
import { listIngredients } from '@/services/ingredients.service.js';
import { listProducts } from '@/services/products.service.js';
import { listRecipes } from '@/services/recipes.service.js';
import { getRestaurantDashboard } from '@/services/dashboard.service.js';
import { getFinanceSummary } from '@/services/finance.service.js';
import { buildReport, REPORT_TYPES } from '@/services/reports.service.js';
import { listCompanyUsers } from '@/services/users.service.js';
import { getCompanyProfile } from '@/services/settings.service.js';
import { getPlatformStats, listPlatformCompanies } from '@/services/platform.service.js';
import { canAccessModule, ROLES } from '@/config/roles.config.js';
import { listSuppliers } from '@/services/suppliers.service.js';
import { listPurchases } from '@/services/purchases.service.js';
import { listWasteRecords } from '@/services/waste.service.js';
import { listStockPositions } from '@/services/inventory.service.js';

describe('Smoke runtime · sistema operacional', () => {
  beforeAll(() => {
    localStorage.clear();
  });

  it('admin autentica e carrega todos os módulos core', async () => {
    const { user, company } = await login({
      email: 'admin@nexusfood.local',
      password: 'admin',
    });
    expect(user.role).toBe(ROLES.COMPANY_ADMIN);
    expect(company?.id).toBeTruthy();

    const cid = company.id;
    expect(listIngredients(cid).length).toBeGreaterThan(0);
    expect(listProducts(cid).length).toBeGreaterThan(0);
    expect(listRecipes(cid).length).toBeGreaterThan(0);
    expect(listSuppliers(cid).length).toBeGreaterThan(0);
    expect(listStockPositions(cid).length).toBeGreaterThan(0);
    expect(listPurchases(cid).length).toBeGreaterThanOrEqual(0);
    expect(listWasteRecords(cid).length).toBeGreaterThanOrEqual(0);
    expect(getFinanceSummary(cid).txsCount).toBeGreaterThan(0);
    expect(getRestaurantDashboard(cid, { idealCmv: company.idealCmv }).source).toBe('live');
    expect(listCompanyUsers(cid).length).toBeGreaterThanOrEqual(2);
    expect(getCompanyProfile(cid).idealCmv).toBeGreaterThan(0);

    for (const t of REPORT_TYPES) {
      const report = buildReport(cid, t.key, { preset: '30d', idealCmv: company.idealCmv || 32 });
      expect(report.type).toBe(t.key);
      expect(Array.isArray(report.rows)).toBe(true);
    }

    expect(canAccessModule(user.role, user.permissions, 'finance')).toBe(true);
    expect(canAccessModule(user.role, user.permissions, 'users')).toBe(true);
    await logout();
  });

  it('funcionário não acessa financeiro', async () => {
    const { user } = await login({
      email: 'estoque@nexusfood.local',
      password: 'estoque',
    });
    expect(user.role).toBe(ROLES.EMPLOYEE);
    expect(canAccessModule(user.role, user.permissions, 'finance')).toBe(false);
    expect(canAccessModule(user.role, user.permissions, 'inventory')).toBe(true);
    await logout();
  });

  it('super admin vê plataforma sem company', async () => {
    const { user, company } = await login({
      email: 'super@evolutivatech.com.br',
      password: 'super',
    });
    expect(user.role).toBe(ROLES.PLATFORM_SUPER_ADMIN);
    expect(company).toBeNull();
    expect(getPlatformStats().companiesTotal).toBeGreaterThanOrEqual(1);
    expect(listPlatformCompanies().length).toBeGreaterThanOrEqual(1);
    await logout();
  });

  it('rejeita credenciais inválidas', async () => {
    await expect(login({ email: 'nope@x.com', password: 'wrong' })).rejects.toThrow();
  });
});
