import { beforeEach, describe, expect, it } from 'vitest';
import {
  createIngredient,
  getIngredient,
  listIngredients,
  resetIngredients,
} from '@/services/ingredients.service.js';
import { listProducts, resetProducts } from '@/services/products.service.js';
import { listRecipes, resetRecipes, getRecipeByProduct } from '@/services/recipes.service.js';
import { resetInventoryMovements, listInventoryMovements } from '@/services/inventory.service.js';
import {
  createSupplier,
  listIngredientPriceHistory,
  listSuppliers,
  resetSuppliers,
} from '@/services/suppliers.service.js';
import { createPurchase, listPurchases, resetPurchases } from '@/services/purchases.service.js';
import {
  createWasteRecord,
  getWasteStats,
  listWasteRecords,
  resetWaste,
} from '@/services/waste.service.js';

const COMPANY = 'company_ops_flow';

async function boot() {
  await import('@/services/inventory.service.js');
  await import('@/services/recipes.service.js');
  resetWaste(COMPANY);
  resetPurchases(COMPANY);
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

describe('Fases 9–11 · fornecedores, compras, desperdícios', () => {
  beforeEach(async () => {
    localStorage.clear();
    await boot();
  });

  it('cadastra fornecedor isolado por empresa', () => {
    const s = createSupplier(COMPANY, {
      name: 'Distribuidora Norte',
      phone: '11999990000',
      ingredientIds: ['ing_oleo'],
    });
    expect(s.companyId).toBe(COMPANY);
    expect(listSuppliers(COMPANY).some((x) => x.id === s.id)).toBe(true);
  });

  it('compra confirmada aumenta estoque, atualiza custo e histórico', () => {
    const beforeQty = getIngredient(COMPANY, 'ing_carne').quantity;
    const beforeCost = getIngredient(COMPANY, 'ing_carne').currentCost;
    const beforeRecipeCost = getRecipeByProduct(COMPANY, 'prd_xbacon').totalCost;

    const suppliers = listSuppliers(COMPANY);
    const purchase = createPurchase(COMPANY, {
      supplierId: suppliers[0]?.id || null,
      purchaseDate: '2026-09-09',
      paymentMethod: 'pix',
      status: 'confirmed',
      items: [
        {
          ingredientId: 'ing_carne',
          quantity: 5,
          unitPrice: beforeCost + 3,
        },
      ],
    });

    expect(purchase.total).toBeCloseTo(5 * (beforeCost + 3));
    expect(getIngredient(COMPANY, 'ing_carne').quantity).toBeCloseTo(beforeQty + 5);
    expect(getIngredient(COMPANY, 'ing_carne').currentCost).toBeCloseTo(beforeCost + 3);

    const history = listIngredientPriceHistory(COMPANY, { ingredientId: 'ing_carne' });
    expect(history.some((h) => h.source === 'purchase')).toBe(true);

    const afterRecipeCost = getRecipeByProduct(COMPANY, 'prd_xbacon').totalCost;
    expect(afterRecipeCost).toBeGreaterThan(beforeRecipeCost);

    expect(listInventoryMovements(COMPANY).some((m) => m.type === 'compra')).toBe(true);
    expect(listPurchases(COMPANY)[0].id).toBe(purchase.id);
  });

  it('desperdício baixa estoque e calcula valor perdido', () => {
    const before = getIngredient(COMPANY, 'ing_bacon');
    const record = createWasteRecord(COMPANY, {
      ingredientId: 'ing_bacon',
      quantity: 0.2,
      reason: 'expiration',
      wasteDate: new Date().toISOString().slice(0, 10),
      employeeName: 'Carlos',
      notes: 'Lote vencido',
    });

    expect(record.totalLoss).toBeCloseTo(0.2 * before.currentCost);
    expect(getIngredient(COMPANY, 'ing_bacon').quantity).toBeCloseTo(before.quantity - 0.2);
    expect(listWasteRecords(COMPANY)[0].id).toBe(record.id);

    const stats = getWasteStats(COMPANY);
    expect(stats.month).toBeGreaterThan(0);
    expect(stats.ranking[0].name).toBe('Bacon');
  });

  it('Company B não vê compras/desperdícios de A', () => {
    const B = 'company_ops_b';
    resetPurchases(B);
    resetWaste(B);
    resetSuppliers(B);
    resetInventoryMovements(B);
    resetIngredients(B);
    listIngredients(B);
    listSuppliers(B);

    createPurchase(COMPANY, {
      purchaseDate: '2026-09-09',
      paymentMethod: 'cash',
      status: 'confirmed',
      items: [{ ingredientId: 'ing_oleo', quantity: 1, unitPrice: 10 }],
    });

    expect(listPurchases(B)).toHaveLength(0);
    expect(listPurchases(COMPANY).length).toBeGreaterThan(0);
  });
});
