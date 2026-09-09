/**
 * Cálculos de ficha técnica / CMV — camada de domínio pura.
 */
import { calcCmvPercent, calcMarginPercent, calcMarkup } from '@/core/utils/money.js';

const MASS = new Set(['kg', 'g']);
const VOLUME = new Set(['L', 'ml']);
const COUNT = new Set(['un', 'cx', 'pct']);

/**
 * Famílias de unidade conversíveis entre si.
 */
export function getUnitFamily(unit) {
  if (MASS.has(unit)) return 'mass';
  if (VOLUME.has(unit)) return 'volume';
  if (COUNT.has(unit)) return 'count';
  return null;
}

export function areUnitsCompatible(fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return false;
  if (fromUnit === toUnit) return true;
  const a = getUnitFamily(fromUnit);
  const b = getUnitFamily(toUnit);
  if (!a || !b) return false;
  // Contagem: só mesma unidade (un≠cx≠pct) no MVP.
  if (a === 'count' || b === 'count') return fromUnit === toUnit;
  return a === b;
}

/**
 * Converte quantidade entre unidades.
 * @param {number} qty
 * @param {string} fromUnit
 * @param {string} toUnit
 * @param {{ strict?: boolean }} [options] — strict=true lança erro se incompatível (ficha técnica)
 */
export function convertQuantity(qty, fromUnit, toUnit, { strict = false } = {}) {
  const q = Number(qty);
  if (!Number.isFinite(q)) {
    if (strict) throw new Error('Quantidade inválida para conversão.');
    return 0;
  }
  if (fromUnit === toUnit) return q;

  if (!areUnitsCompatible(fromUnit, toUnit)) {
    if (strict) {
      throw new Error(
        `Não é possível converter ${fromUnit} → ${toUnit}. Use unidades da mesma família (kg/g, L/ml ou a mesma unidade de contagem).`,
      );
    }
    return q;
  }

  if (fromUnit === 'g' && toUnit === 'kg') return q / 1000;
  if (fromUnit === 'kg' && toUnit === 'g') return q * 1000;
  if (fromUnit === 'ml' && toUnit === 'L') return q / 1000;
  if (fromUnit === 'L' && toUnit === 'ml') return q * 1000;

  if (strict) {
    throw new Error(`Conversão não suportada: ${fromUnit} → ${toUnit}.`);
  }
  return q;
}

/**
 * Custo de uma linha da ficha (quantidade na unidade do ingrediente × custo unitário).
 */
export function calcLineCost(line) {
  const ingredient = line?.ingredient;
  if (!ingredient) return 0;
  const qtyInIngredientUnit = convertQuantity(line.quantity, line.unit, ingredient.unit, {
    strict: true,
  });
  return qtyInIngredientUnit * (Number(ingredient.currentCost) || 0);
}

/**
 * @param {Array<{ quantity: number, unit: string, ingredient: { unit: string, currentCost: number } }>} lines
 * @param {{ strict?: boolean }} [options]
 */
export function calcRecipeCost(lines, { strict = true } = {}) {
  return (lines || []).reduce((sum, line) => {
    const ingredient = line.ingredient;
    if (!ingredient) return sum;
    try {
      const qtyInIngredientUnit = convertQuantity(line.quantity, line.unit, ingredient.unit, {
        strict,
      });
      return sum + qtyInIngredientUnit * (Number(ingredient.currentCost) || 0);
    } catch (err) {
      if (strict) throw err;
      return sum;
    }
  }, 0);
}

/**
 * Breakdown por linha para UI / auditoria.
 */
export function buildRecipeCostBreakdown(lines) {
  const details = [];
  let totalCost = 0;
  for (const line of lines || []) {
    if (!line.ingredient) {
      details.push({
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit,
        lineCost: 0,
        missing: true,
        conversionError: null,
      });
      continue;
    }
    try {
      const qtyConverted = convertQuantity(line.quantity, line.unit, line.ingredient.unit, {
        strict: true,
      });
      const lineCost = qtyConverted * (Number(line.ingredient.currentCost) || 0);
      totalCost += lineCost;
      details.push({
        ingredientId: line.ingredientId,
        ingredientName: line.ingredient.name,
        quantity: line.quantity,
        unit: line.unit,
        ingredientUnit: line.ingredient.unit,
        unitCost: Number(line.ingredient.currentCost) || 0,
        qtyConverted,
        lineCost,
        missing: false,
        conversionError: null,
      });
    } catch (err) {
      details.push({
        ingredientId: line.ingredientId,
        ingredientName: line.ingredient.name,
        quantity: line.quantity,
        unit: line.unit,
        ingredientUnit: line.ingredient.unit,
        unitCost: Number(line.ingredient.currentCost) || 0,
        qtyConverted: null,
        lineCost: 0,
        missing: false,
        conversionError: err.message,
      });
    }
  }
  return { totalCost, lines: details };
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
