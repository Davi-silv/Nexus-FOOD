import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTransaction,
  getFinanceSummary,
  listPayables,
  listTransactions,
  markPayablePaid,
  resetFinance,
  createPayable,
} from '@/services/finance.service.js';
import { getRestaurantDashboard } from '@/services/dashboard.service.js';
import { listIngredients, resetIngredients } from '@/services/ingredients.service.js';
import { listProducts, resetProducts } from '@/services/products.service.js';
import { listRecipes, resetRecipes } from '@/services/recipes.service.js';
import { resetInventoryMovements } from '@/services/inventory.service.js';
import { resetSuppliers, listSuppliers } from '@/services/suppliers.service.js';
import { resetWaste } from '@/services/waste.service.js';
import { DEMO_COMPANY } from '@/data/demo.js';

const COMPANY = DEMO_COMPANY.id;

async function boot() {
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

describe('finance.service', () => {
  beforeEach(async () => {
    localStorage.clear();
    await boot();
  });

  it('seed gera receitas/despesas e resumo do mês', () => {
    const summary = getFinanceSummary(COMPANY);
    expect(summary.incomeMonth).toBeGreaterThan(0);
    expect(summary.expenseMonth).toBeGreaterThan(0);
    expect(listTransactions(COMPANY).length).toBeGreaterThan(5);
    expect(summary.payablesPending).toBeGreaterThan(0);
  });

  it('cria lançamento e atualiza saldo', () => {
    const before = getFinanceSummary(COMPANY);
    createTransaction(COMPANY, {
      type: 'income',
      description: 'Venda extra',
      amount: 500,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'pix',
      categoryId: 'cat_vendas',
    });
    const after = getFinanceSummary(COMPANY);
    expect(after.incomeMonth).toBeCloseTo(before.incomeMonth + 500);
  });

  it('pagar conta a pagar gera despesa', () => {
    const ap = createPayable(COMPANY, {
      description: 'Teste AP',
      amount: 150,
      dueDate: '2026-09-20',
      status: 'pending',
    });
    const txsBefore = listTransactions(COMPANY).length;
    markPayablePaid(COMPANY, ap.id, { paymentMethod: 'pix' });
    expect(listPayables(COMPANY).find((p) => p.id === ap.id).status).toBe('paid');
    expect(listTransactions(COMPANY).length).toBe(txsBefore + 1);
  });

  it('isolamento multiempresa', () => {
    const B = 'company_finance_b';
    resetFinance(B);
    createTransaction(COMPANY, {
      type: 'income',
      description: 'Só A',
      amount: 10,
      date: '2026-09-09',
      paymentMethod: 'cash',
    });
    expect(listTransactions(B).every((t) => t.companyId === B || t.description !== 'Só A')).toBe(
      true,
    );
    expect(listTransactions(COMPANY).some((t) => t.description === 'Só A')).toBe(true);
  });
});

describe('dashboard.service', () => {
  beforeEach(async () => {
    localStorage.clear();
    await boot();
  });

  it('agrega estoque, CMV, desperdício e financeiro', () => {
    const dash = getRestaurantDashboard(COMPANY);
    expect(dash.stockValue).toBeGreaterThan(0);
    expect(dash.cmvPercent).toBeGreaterThan(0);
    expect(dash.payablesPending).toBeGreaterThan(0);
    expect(dash.alerts.length).toBeGreaterThan(0);
    expect(dash.topMargin.length).toBeGreaterThan(0);
  });
});
