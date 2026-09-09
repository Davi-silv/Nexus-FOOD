import { beforeEach, describe, expect, it } from 'vitest';
import {
  createIngredient,
  getIngredient,
  listIngredients,
  resetIngredients,
  updateIngredient,
} from '@/services/ingredients.service.js';
import { listProducts, resetProducts } from '@/services/products.service.js';
import { listRecipes, resetRecipes } from '@/services/recipes.service.js';
import {
  applySaleConsumption,
  computeNextQuantity,
  createInventoryMovement,
  listInventoryMovements,
  listStockPositions,
  resetInventoryMovements,
} from '@/services/inventory.service.js';
import { validateInventoryMovement } from '@/validations/inventory.validation.js';
import { DEMO_COMPANY } from '@/data/demo.js';

const COMPANY = DEMO_COMPANY.id;

async function boot() {
  await import('@/services/inventory.service.js');
  await import('@/services/recipes.service.js');
  resetInventoryMovements(COMPANY);
  resetIngredients(COMPANY);
  resetProducts(COMPANY);
  resetRecipes(COMPANY);
  listIngredients(COMPANY);
  listProducts(COMPANY);
  listRecipes(COMPANY);
}

describe('validateInventoryMovement', () => {
  it('exige tipo e quantidade válidos', () => {
    const bad = validateInventoryMovement({
      ingredientId: '',
      type: 'foo',
      quantity: 0,
    });
    expect(bad.ok).toBe(false);

    const ok = validateInventoryMovement({
      ingredientId: 'ing_x',
      type: 'entrada',
      quantity: 2,
    });
    expect(ok.ok).toBe(true);
  });
});

describe('inventory.service', () => {
  beforeEach(async () => {
    localStorage.clear();
    await boot();
  });

  it('entrada aumenta estoque e gera histórico', () => {
    const before = getIngredient(COMPANY, 'ing_bacon');
    const mov = createInventoryMovement(COMPANY, {
      ingredientId: 'ing_bacon',
      type: 'entrada',
      quantity: 2,
    });
    const after = getIngredient(COMPANY, 'ing_bacon');
    expect(after.quantity).toBeCloseTo(before.quantity + 2);
    expect(mov.balanceBefore).toBe(before.quantity);
    expect(mov.balanceAfter).toBe(after.quantity);
    expect(listInventoryMovements(COMPANY)[0].id).toBe(mov.id);
  });

  it('saída insuficiente é bloqueada', () => {
    expect(() =>
      createInventoryMovement(COMPANY, {
        ingredientId: 'ing_bacon',
        type: 'saida',
        quantity: 9999,
      }),
    ).toThrow(/insuficiente/i);
  });

  it('ajuste define saldo absoluto', () => {
    createInventoryMovement(COMPANY, {
      ingredientId: 'ing_queijo',
      type: 'ajuste',
      quantity: 10,
    });
    expect(getIngredient(COMPANY, 'ing_queijo').quantity).toBe(10);
  });

  it('updateIngredient não altera quantidade sem movimentação', () => {
    const before = getIngredient(COMPANY, 'ing_pao');
    updateIngredient(COMPANY, 'ing_pao', {
      ...before,
      quantity: before.quantity + 50,
      name: before.name,
    });
    expect(getIngredient(COMPANY, 'ing_pao').quantity).toBe(before.quantity);
  });

  it('posições mostram status crítico para bacon', () => {
    const positions = listStockPositions(COMPANY);
    const bacon = positions.find((p) => p.ingredientId === 'ing_bacon');
    expect(bacon.level).toBe('critical');
    expect(bacon.stockValue).toBeCloseTo(bacon.quantity * bacon.currentCost);
  });

  it('baixa automática por venda (2 X-Bacon) consome ficha técnica', () => {
    const paoBefore = getIngredient(COMPANY, 'ing_pao').quantity;
    const carneBefore = getIngredient(COMPANY, 'ing_carne').quantity;

    const result = applySaleConsumption(COMPANY, {
      productId: 'prd_xbacon',
      quantity: 2,
      saleId: 'sale_test_1',
    });

    expect(result.movements.length).toBeGreaterThanOrEqual(5);
    expect(getIngredient(COMPANY, 'ing_pao').quantity).toBeCloseTo(paoBefore - 2);
    // 300g = 0.3 kg
    expect(getIngredient(COMPANY, 'ing_carne').quantity).toBeCloseTo(carneBefore - 0.3);
    expect(
      listInventoryMovements(COMPANY).some((m) => m.type === 'consumo' && m.referenceId === 'sale_test_1'),
    ).toBe(true);
  });

  it('isolamento multiempresa nas movimentações', () => {
    const other = 'company_stock_other';
    resetInventoryMovements(other);
    resetIngredients(other);
    listIngredients(other);

    createInventoryMovement(COMPANY, {
      ingredientId: 'ing_oleo',
      type: 'entrada',
      quantity: 1,
    });

    expect(listInventoryMovements(other)).toHaveLength(0);
    expect(listInventoryMovements(COMPANY).every((m) => m.companyId === COMPANY)).toBe(true);
  });
});

describe('computeNextQuantity', () => {
  it('aplica direções corretas', () => {
    expect(computeNextQuantity(10, 'entrada', 2)).toBe(12);
    expect(computeNextQuantity(10, 'saida', 3)).toBe(7);
    expect(computeNextQuantity(10, 'ajuste', 4)).toBe(4);
    expect(computeNextQuantity(10, 'consumo', 1)).toBe(9);
  });
});
