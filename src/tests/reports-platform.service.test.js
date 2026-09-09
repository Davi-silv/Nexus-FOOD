import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildReport,
  resolveDateRange,
  REPORT_TYPES,
} from '@/services/reports.service.js';
import {
  createPlatformCompany,
  getPlatformStats,
  listPlatformCompanies,
  logSupportAccess,
  listSupportLogs,
  resetPlatformDemo,
  setCompanyStatus,
} from '@/services/platform.service.js';
import { resetFinance } from '@/services/finance.service.js';
import { listIngredients, resetIngredients } from '@/services/ingredients.service.js';
import { listProducts, resetProducts } from '@/services/products.service.js';
import { listRecipes, resetRecipes } from '@/services/recipes.service.js';
import { resetInventoryMovements } from '@/services/inventory.service.js';
import { resetSuppliers, listSuppliers } from '@/services/suppliers.service.js';
import { resetWaste } from '@/services/waste.service.js';

const COMPANY = 'company_demo_nexus';

async function bootFood() {
  await import('@/services/inventory.service.js');
  await import('@/services/recipes.service.js');
  resetFinance(COMPANY);
  resetWaste(COMPANY);
  resetSuppliers(COMPANY);
  resetInventoryMovements(COMPANY);
  resetIngredients(COMPANY);
  resetProducts(COMPANY);
  resetRecipes(COMPANY);
  listIngredients(COMPANY);
  listProducts(COMPANY);
  listRecipes(COMPANY);
  listSuppliers(COMPANY);
}

describe('reports.service', () => {
  beforeEach(async () => {
    localStorage.clear();
    await bootFood();
  });

  it('resolveDateRange cobre presets principais', () => {
    const today = resolveDateRange('today');
    expect(today.from).toBe(today.to);
    const week = resolveDateRange('7d');
    expect(week.from < week.to || week.from === week.to).toBe(true);
    const custom = resolveDateRange('custom', '2026-01-10', '2026-01-01');
    expect(custom.from).toBe('2026-01-01');
    expect(custom.to).toBe('2026-01-10');
  });

  it('gera todos os tipos de relatório sem erro', () => {
    for (const t of REPORT_TYPES) {
      const report = buildReport(COMPANY, t.key, { preset: 'month', idealCmv: 32 });
      expect(report.type).toBe(t.key);
      expect(report.range.from).toBeTruthy();
      expect(Array.isArray(report.rows)).toBe(true);
      expect(Array.isArray(report.kpis)).toBe(true);
    }
  });

  it('financeiro agrega receitas do seed', () => {
    const report = buildReport(COMPANY, 'finance', { preset: '30d' });
    const incomeKpi = report.kpis.find((k) => k.label === 'Receitas');
    expect(incomeKpi.value).toBeGreaterThan(0);
    expect(report.rows.length).toBeGreaterThan(0);
  });

  it('margem e CMV usam fichas técnicas', () => {
    const margin = buildReport(COMPANY, 'margin', { preset: 'month' });
    const cmv = buildReport(COMPANY, 'cmv', { preset: 'month', idealCmv: 32 });
    expect(margin.rows.length).toBeGreaterThan(0);
    expect(cmv.rows.length).toBeGreaterThan(0);
  });
});

describe('platform.service', () => {
  beforeEach(() => {
    localStorage.clear();
    resetPlatformDemo();
  });

  it('lista empresas seed e calcula stats', () => {
    const companies = listPlatformCompanies();
    expect(companies.length).toBeGreaterThanOrEqual(3);
    const stats = getPlatformStats();
    expect(stats.companiesTotal).toBe(companies.length);
    expect(stats.totalUsers).toBeGreaterThan(0);
  });

  it('cria empresa e suspende', () => {
    const created = createPlatformCompany({
      name: 'Teste SA',
      tradeName: 'Teste',
      planSlug: 'start',
      subscriptionStatus: 'trial',
    });
    expect(listPlatformCompanies().some((c) => c.id === created.id)).toBe(true);
    setCompanyStatus(created.id, 'suspended');
    expect(listPlatformCompanies().find((c) => c.id === created.id).status).toBe('suspended');
  });

  it('registra acesso de suporte com auditoria', () => {
    const company = listPlatformCompanies()[0];
    logSupportAccess({
      adminUserId: 'admin1',
      adminName: 'Suporte',
      companyId: company.id,
      companyName: company.tradeName,
      reason: 'Investigar CMV',
    });
    expect(listSupportLogs()[0].reason).toBe('Investigar CMV');
  });
});
