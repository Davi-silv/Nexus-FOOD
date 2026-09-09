import { beforeEach, describe, expect, it } from 'vitest';
import { updateIngredient, resetIngredients, listIngredients } from '@/services/ingredients.service.js';
import { resetProducts, listProducts } from '@/services/products.service.js';
import {
  getRecipeByProduct,
  listRecipeCostHistory,
  listRecipes,
  recalculateRecipesAffectedByIngredient,
  resetRecipes,
  saveRecipe,
} from '@/services/recipes.service.js';
import { calcRecipeCost, calcRecipeMetrics } from '@/services/recipe.service.js';
import { validateRecipe } from '@/validations/recipe.validation.js';
import { DEMO_COMPANY } from '@/data/demo.js';

const COMPANY = DEMO_COMPANY.id;

function ensureSeed() {
  resetRecipes(COMPANY);
  resetIngredients(COMPANY);
  resetProducts(COMPANY);
  // force seeds
  listIngredients(COMPANY);
  listProducts(COMPANY);
  listRecipes(COMPANY);
}

describe('validateRecipe', () => {
  it('exige produto e itens', () => {
    const result = validateRecipe({ productId: '', items: [] });
    expect(result.ok).toBe(false);
    expect(result.errors.productId).toBeTruthy();
    expect(result.errors.items).toBeTruthy();
  });

  it('rejeita ingrediente duplicado', () => {
    const result = validateRecipe({
      productId: 'prd_xbacon',
      items: [
        { ingredientId: 'ing_pao', quantity: 1, unit: 'un' },
        { ingredientId: 'ing_pao', quantity: 2, unit: 'un' },
      ],
    });
    expect(result.ok).toBe(false);
  });
});

describe('recipes.service', () => {
  beforeEach(() => {
    localStorage.clear();
    ensureSeed();
  });

  it('seed inclui X-Bacon com métricas coerentes', () => {
    const recipe = getRecipeByProduct(COMPANY, 'prd_xbacon');
    expect(recipe).toBeTruthy();
    expect(recipe.items.length).toBeGreaterThanOrEqual(5);
    expect(recipe.totalCost).toBeGreaterThan(10);
    expect(recipe.totalCost).toBeLessThan(13);
    expect(recipe.salePrice).toBe(31.9);
    expect(recipe.marginPercent).toBeGreaterThan(60);
    expect(recipe.grossProfit).toBeCloseTo(31.9 - recipe.totalCost, 2);
  });

  it('recalcula ficha quando custo do ingrediente muda', async () => {
    // garante handlers registrados
    await import('@/services/recipes.service.js');

    const before = getRecipeByProduct(COMPANY, 'prd_xbacon');
    const previousCost = before.totalCost;

    const carne = listIngredients(COMPANY).find((i) => i.id === 'ing_carne');
    updateIngredient(COMPANY, 'ing_carne', {
      ...carne,
      currentCost: 50,
    });

    const after = getRecipeByProduct(COMPANY, 'prd_xbacon');
    expect(after.totalCost).toBeGreaterThan(previousCost);

    const history = listRecipeCostHistory(COMPANY, { recipeId: after.id });
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].reason).toBe('ingredient_price_change');
  });

  it('salva nova ficha e impede duplicar produto', () => {
    resetRecipes(COMPANY);
    localStorage.setItem(`nexus-food:recipes:${COMPANY}`, JSON.stringify([]));

    const saved = saveRecipe(COMPANY, {
      productId: 'prd_coca',
      items: [{ ingredientId: 'ing_embalagem', quantity: 1, unit: 'un' }],
    });
    expect(saved.productId).toBe('prd_coca');
    expect(saved.totalCost).toBeCloseTo(0.45);

    expect(() =>
      saveRecipe(COMPANY, {
        productId: 'prd_coca',
        items: [{ ingredientId: 'ing_embalagem', quantity: 2, unit: 'un' }],
      }),
    ).toThrow(/já possui ficha/i);
  });

  it('isolamento: Company A não vê fichas de B', () => {
    const other = 'company_recipe_other';
    resetRecipes(other);
    listIngredients(other);
    listProducts(other);
    listRecipes(other);

    expect(listRecipes(COMPANY).every((r) => r.companyId === COMPANY)).toBe(true);
    expect(listRecipes(other).every((r) => r.companyId === other)).toBe(true);
  });
});

describe('X-Bacon custo de referência', () => {
  it('calcula custo e margem do exemplo (demo atual)', () => {
    const lines = [
      { quantity: 1, unit: 'un', ingredient: { unit: 'un', currentCost: 1.2 } },
      { quantity: 150, unit: 'g', ingredient: { unit: 'kg', currentCost: 42.9 } },
      { quantity: 50, unit: 'g', ingredient: { unit: 'kg', currentCost: 38.5 } },
      { quantity: 40, unit: 'g', ingredient: { unit: 'kg', currentCost: 32 } },
      { quantity: 30, unit: 'ml', ingredient: { unit: 'L', currentCost: 18 } },
      { quantity: 1, unit: 'un', ingredient: { unit: 'un', currentCost: 0.45 } },
    ];
    const cost = calcRecipeCost(lines);
    // 1.2 + 6.435 + 1.925 + 1.28 + 0.54 + 0.45 = 11.83
    expect(cost).toBeCloseTo(11.83, 2);
    const metrics = calcRecipeMetrics(31.9, cost);
    expect(metrics.grossProfit).toBeCloseTo(20.07, 2);
    expect(metrics.marginPercent).toBeGreaterThan(60);
    expect(metrics.cmvPercent).toBeCloseTo((11.83 / 31.9) * 100, 1);
  });
});
