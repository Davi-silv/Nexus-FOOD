/**
 * Barramento leve para efeitos entre módulos (evita import circular).
 */

/** @type {null | ((companyId: string, ingredientId: string, meta: object) => void)} */
let onIngredientCostChanged = null;

/** @type {null | ((companyId: string, productId: string) => void)} */
let onProductPriceChanged = null;

/** @type {null | ((companyId: string, ingredient: object) => void)} */
let onIngredientCreated = null;

export function registerIngredientCostHandler(handler) {
  onIngredientCostChanged = handler;
}

export function registerProductPriceHandler(handler) {
  onProductPriceChanged = handler;
}

export function registerIngredientCreatedHandler(handler) {
  onIngredientCreated = handler;
}

export function emitIngredientCostChanged(companyId, ingredientId, meta = {}) {
  onIngredientCostChanged?.(companyId, ingredientId, meta);
}

export function emitProductPriceChanged(companyId, productId) {
  onProductPriceChanged?.(companyId, productId);
}

export function emitIngredientCreated(companyId, ingredient) {
  onIngredientCreated?.(companyId, ingredient);
}
