/**
 * Fase 17 — fluxo ponta a ponta do MVP Nexus Food
 *
 * Usa seed demo + compra → estoque/custo → desperdício → financeiro →
 * dashboard → relatório + isolamento multiempresa + permissões.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getIngredient,
  listIngredients,
  resetIngredients,
} from '@/services/ingredients.service.js';
import { listProducts, resetProducts } from '@/services/products.service.js';
import {
  getRecipeByProduct,
  listRecipes,
  resetRecipes,
} from '@/services/recipes.service.js';
import {
  listInventoryMovements,
  resetInventoryMovements,
} from '@/services/inventory.service.js';
import {
  listSuppliers,
  resetSuppliers,
} from '@/services/suppliers.service.js';
import { createPurchase, listPurchases, resetPurchases } from '@/services/purchases.service.js';
import { createWasteRecord, resetWaste } from '@/services/waste.service.js';
import {
  createTransaction,
  getFinanceSummary,
  listTransactions,
  resetFinance,
} from '@/services/finance.service.js';
import { getRestaurantDashboard } from '@/services/dashboard.service.js';
import { buildReport } from '@/services/reports.service.js';
import { canAccessModule, DEFAULT_EMPLOYEE_PERMISSIONS, ROLES } from '@/config/roles.config.js';

const A = 'company_e2e_a';
const B = 'company_e2e_b';

async function boot(companyId) {
  await import('@/services/inventory.service.js');
  await import('@/services/recipes.service.js');
  resetFinance(companyId);
  resetWaste(companyId);
  resetPurchases(companyId);
  resetSuppliers(companyId);
  resetInventoryMovements(companyId);
  resetIngredients(companyId);
  resetProducts(companyId);
  resetRecipes(companyId);
  listIngredients(companyId);
  listProducts(companyId);
  listRecipes(companyId);
  listSuppliers(companyId);
}

describe('Fase 17 · fluxo E2E MVP', () => {
  beforeEach(async () => {
    localStorage.clear();
    await boot(A);
    await boot(B);
  });

  it('executa o fluxo completo de lucro', () => {
    expect(listIngredients(A).length).toBeGreaterThan(0);
    expect(listProducts(A).length).toBeGreaterThan(0);

    const recipeBefore = getRecipeByProduct(A, 'prd_xbacon');
    expect(recipeBefore.totalCost).toBeGreaterThan(0);
    expect(recipeBefore.marginPercent).toBeGreaterThan(50);

    const beforeQty = getIngredient(A, 'ing_carne').quantity;
    const beforeCost = getIngredient(A, 'ing_carne').currentCost;
    const costBefore = recipeBefore.totalCost;

    const purchase = createPurchase(A, {
      supplierId: listSuppliers(A)[0]?.id || null,
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'pix',
      status: 'confirmed',
      items: [{ ingredientId: 'ing_carne', quantity: 3, unitPrice: beforeCost + 5 }],
    });

    expect(purchase.total).toBeCloseTo(3 * (beforeCost + 5));
    expect(getIngredient(A, 'ing_carne').quantity).toBeCloseTo(beforeQty + 3);
    expect(getIngredient(A, 'ing_carne').currentCost).toBeCloseTo(beforeCost + 5);
    expect(getRecipeByProduct(A, 'prd_xbacon').totalCost).toBeGreaterThan(costBefore);
    expect(listInventoryMovements(A).some((m) => m.type === 'compra')).toBe(true);

    const baconBefore = getIngredient(A, 'ing_bacon');
    createWasteRecord(A, {
      ingredientId: 'ing_bacon',
      quantity: 0.1,
      reason: 'expiration',
      wasteDate: new Date().toISOString().slice(0, 10),
      employeeName: 'Carlos',
    });
    expect(getIngredient(A, 'ing_bacon').quantity).toBeCloseTo(baconBefore.quantity - 0.1);

    createTransaction(A, {
      type: 'income',
      description: 'Venda balcão E2E',
      amount: 500,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'pix',
      categoryId: 'cat_vendas',
    });

    const finance = getFinanceSummary(A);
    expect(finance.incomeToday).toBeGreaterThanOrEqual(500);
    expect(listTransactions(A).some((t) => t.type === 'expense')).toBe(true);

    const dash = getRestaurantDashboard(A);
    expect(dash.stockValue).toBeGreaterThan(0);
    expect(dash.cmvPercent).toBeGreaterThan(0);
    expect(dash.source).toBe('live');

    const report = buildReport(A, 'finance', { preset: '30d' });
    expect(report.kpis.find((k) => k.label === 'Receitas').value).toBeGreaterThan(0);

    // Company B não herda compras/transações de A
    expect(listPurchases(B)).toHaveLength(0);
    expect(listTransactions(B).some((t) => t.description === 'Venda balcão E2E')).toBe(false);
  });

  it('funcionário sem finance não acessa financeiro/relatórios', () => {
    const perms = { ...DEFAULT_EMPLOYEE_PERMISSIONS, inventory: true, finance: false, reports: false };
    expect(canAccessModule(ROLES.EMPLOYEE, perms, 'finance')).toBe(false);
    expect(canAccessModule(ROLES.EMPLOYEE, perms, 'reports')).toBe(false);
    expect(canAccessModule(ROLES.EMPLOYEE, perms, 'inventory')).toBe(true);
    expect(canAccessModule(ROLES.COMPANY_ADMIN, {}, 'finance')).toBe(true);
    expect(canAccessModule(ROLES.COMPANY_ADMIN, {}, 'reports')).toBe(true);
  });
});
