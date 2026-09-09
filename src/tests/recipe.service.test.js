import { describe, expect, it } from 'vitest';
import {
  calcRecipeCost,
  calcRecipeMetrics,
  expandRecipeConsumption,
  convertQuantity,
} from '@/services/recipe.service.js';

describe('recipe.service', () => {
  it('converte g → kg', () => {
    expect(convertQuantity(150, 'g', 'kg')).toBeCloseTo(0.15);
  });

  it('calcula custo da ficha X-Bacon demo', () => {
    const lines = [
      { quantity: 1, unit: 'un', ingredient: { unit: 'un', currentCost: 1.2 } },
      { quantity: 150, unit: 'g', ingredient: { unit: 'kg', currentCost: 42.9 } },
      { quantity: 50, unit: 'g', ingredient: { unit: 'kg', currentCost: 38.5 } },
      { quantity: 40, unit: 'g', ingredient: { unit: 'kg', currentCost: 32 } },
      { quantity: 30, unit: 'ml', ingredient: { unit: 'L', currentCost: 18 } },
      { quantity: 1, unit: 'un', ingredient: { unit: 'un', currentCost: 0.45 } },
    ];
    const cost = calcRecipeCost(lines);
    expect(cost).toBeGreaterThan(10);
    expect(cost).toBeLessThan(13);

    const metrics = calcRecipeMetrics(31.9, cost);
    expect(metrics.marginPercent).toBeGreaterThan(60);
    expect(metrics.grossProfit).toBeCloseTo(31.9 - cost);
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
