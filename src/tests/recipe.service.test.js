import { describe, expect, it } from 'vitest';
import {
  areUnitsCompatible,
  buildRecipeCostBreakdown,
  calcRecipeCost,
  calcRecipeMetrics,
  convertQuantity,
  expandRecipeConsumption,
} from '@/services/recipe.service.js';
import { validateRecipe } from '@/validations/recipe.validation.js';

describe('recipe.service · conversão e custo', () => {
  it('converte g ↔ kg e ml ↔ L', () => {
    expect(convertQuantity(150, 'g', 'kg')).toBeCloseTo(0.15);
    expect(convertQuantity(0.15, 'kg', 'g')).toBeCloseTo(150);
    expect(convertQuantity(30, 'ml', 'L')).toBeCloseTo(0.03);
  });

  it('em modo strict, rejeita unidades incompatíveis', () => {
    expect(areUnitsCompatible('g', 'kg')).toBe(true);
    expect(areUnitsCompatible('g', 'un')).toBe(false);
    expect(() => convertQuantity(1, 'g', 'un', { strict: true })).toThrow(/converter/i);
  });

  it('calcula custo exato do X-Bacon de referência', () => {
    // 1.2 + 6.435 + 1.925 + 1.28 + 0.54 + 0.45 = 11.83
    const lines = [
      { quantity: 1, unit: 'un', ingredient: { unit: 'un', currentCost: 1.2 } },
      { quantity: 150, unit: 'g', ingredient: { unit: 'kg', currentCost: 42.9 } },
      { quantity: 50, unit: 'g', ingredient: { unit: 'kg', currentCost: 38.5 } },
      { quantity: 40, unit: 'g', ingredient: { unit: 'kg', currentCost: 32 } },
      { quantity: 30, unit: 'ml', ingredient: { unit: 'L', currentCost: 18 } },
      { quantity: 1, unit: 'un', ingredient: { unit: 'un', currentCost: 0.45 } },
    ];
    const cost = calcRecipeCost(lines);
    expect(cost).toBeCloseTo(11.83, 2);

    const metrics = calcRecipeMetrics(31.9, cost);
    expect(metrics.grossProfit).toBeCloseTo(20.07, 2);
    expect(metrics.marginPercent).toBeCloseTo((20.07 / 31.9) * 100, 1);
    expect(metrics.markup).toBeCloseTo(31.9 / 11.83, 2);
    expect(metrics.cmvPercent).toBeCloseTo((11.83 / 31.9) * 100, 1);
  });

  it('150g a R$30/kg = R$4,50', () => {
    const cost = calcRecipeCost([
      { quantity: 150, unit: 'g', ingredient: { unit: 'kg', currentCost: 30 } },
    ]);
    expect(cost).toBeCloseTo(4.5, 4);
  });

  it('buildRecipeCostBreakdown marca erro de conversão sem derrubar total das demais', () => {
    const { totalCost, lines } = buildRecipeCostBreakdown([
      { quantity: 150, unit: 'g', ingredient: { name: 'Carne', unit: 'kg', currentCost: 30 } },
      {
        ingredientId: 'bad',
        quantity: 1,
        unit: 'g',
        ingredient: { name: 'Pão', unit: 'un', currentCost: 1 },
      },
    ]);
    expect(totalCost).toBeCloseTo(4.5, 4);
    expect(lines[1].conversionError).toMatch(/converter/i);
  });

  it('expande consumo para 2 unidades vendidas', () => {
    const items = expandRecipeConsumption(
      [
        { ingredientId: 'ing_pao', quantity: 1, unit: 'un' },
        { ingredientId: 'ing_carne', quantity: 150, unit: 'g' },
      ],
      2,
    );
    expect(items[0].quantity).toBe(2);
    expect(items[1].quantity).toBe(300);
  });
});

describe('validateRecipe · unidades', () => {
  it('rejeita unidade incompatível com o estoque do ingrediente', () => {
    const ingredientsById = new Map([
      ['ing_carne', { id: 'ing_carne', unit: 'kg', name: 'Carne' }],
    ]);
    const result = validateRecipe(
      {
        productId: 'prd_1',
        items: [{ ingredientId: 'ing_carne', quantity: 1, unit: 'un' }],
      },
      { ingredientsById },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.item_0_unit).toMatch(/incompatível/i);
  });

  it('aceita g em ingrediente comprado em kg', () => {
    const ingredientsById = new Map([
      ['ing_carne', { id: 'ing_carne', unit: 'kg', name: 'Carne' }],
    ]);
    const result = validateRecipe(
      {
        productId: 'prd_1',
        items: [{ ingredientId: 'ing_carne', quantity: 150, unit: 'g' }],
      },
      { ingredientsById },
    );
    expect(result.ok).toBe(true);
  });
});
