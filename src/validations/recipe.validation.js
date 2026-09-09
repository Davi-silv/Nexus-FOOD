import { UNITS } from '@/core/constants.js';

const UNIT_VALUES = new Set(UNITS.map((u) => u.value));

/**
 * @param {Record<string, unknown>} input
 */
export function validateRecipe(input) {
  const errors = {};

  const productId = String(input.productId ?? '').trim();
  if (!productId) errors.productId = 'Selecione o produto.';

  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) {
    errors.items = 'Adicione ao menos um ingrediente.';
  }

  const items = [];
  const seen = new Set();

  rawItems.forEach((item, index) => {
    const ingredientId = String(item.ingredientId ?? '').trim();
    const quantity = Number(item.quantity);
    const unit = String(item.unit ?? '').trim();
    const prefix = `item_${index}`;

    if (!ingredientId) {
      errors[`${prefix}_ingredient`] = 'Ingrediente obrigatório.';
      return;
    }
    if (seen.has(ingredientId)) {
      errors[`${prefix}_ingredient`] = 'Ingrediente duplicado na ficha.';
      return;
    }
    seen.add(ingredientId);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors[`${prefix}_quantity`] = 'Quantidade deve ser maior que zero.';
      return;
    }
    if (!UNIT_VALUES.has(unit)) {
      errors[`${prefix}_unit`] = 'Unidade inválida.';
      return;
    }

    items.push({ ingredientId, quantity, unit });
  });

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { productId, items },
  };
}
