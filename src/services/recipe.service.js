/**
 * Cálculos de ficha técnica / CMV — camada de domínio pura.
 */
import { calcCmvPercent, calcMarginPercent, calcMarkup } from '@/core/utils/money.js';

/**
 * Converte quantidade da receita para a unidade base do ingrediente.
 * MVP: assume mesma unidade; conversões kg↔g e L↔ml.
 */
export function convertQuantity(qty, fromUnit, toUnit) {
  const q = Number(qty) || 0;
  if (fromUnit === toUnit) return q;
  if (fromUnit === 'g' && toUnit === 'kg') return q / 1000;
  if (fromUnit === 'kg' && toUnit === 'g') return q * 1000;
  if (fromUnit === 'ml' && toUnit === 'L') return q / 1000;
  if (fromUnit === 'L' && toUnit === 'ml') return q * 1000;
  return q;
}

/**
 * @param {Array<{ quantity: number, unit: string, ingredient: { unit: string, currentCost: number } }>} lines
 */
export function calcRecipeCost(lines) {
  return (lines || []).reduce((sum, line) => {
    const ingredient = line.ingredient;
    if (!ingredient) return sum;
    const qtyInIngredientUnit = convertQuantity(line.quantity, line.unit, ingredient.unit);
    return sum + qtyInIngredientUnit * (Number(ingredient.currentCost) || 0);
  }, 0);
}

export function calcRecipeMetrics(salePrice, totalCost) {
  const cost = Number(totalCost) || 0;
  const price = Number(salePrice) || 0;
  return {
    totalCost: cost,
    salePrice: price,
    grossProfit: price - cost,
    marginPercent: calcMarginPercent(price, cost),
    markup: calcMarkup(price, cost),
    cmvPercent: calcCmvPercent(cost, price),
  };
}

/**
 * Quantidades a baixar do estoque a partir de uma venda.
 * @param {Array<{ ingredientId: string, quantity: number, unit: string }>} recipeItems
 * @param {number} soldQty
 */
export function expandRecipeConsumption(recipeItems, soldQty) {
  const qty = Number(soldQty) || 0;
  return (recipeItems || []).map((item) => ({
    ingredientId: item.ingredientId,
    quantity: (Number(item.quantity) || 0) * qty,
    unit: item.unit,
  }));
}
