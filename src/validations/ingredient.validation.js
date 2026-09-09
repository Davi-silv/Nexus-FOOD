import { UNITS } from '@/core/constants.js';

const UNIT_VALUES = new Set(UNITS.map((u) => u.value));

/**
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, data: object } | { ok: false, errors: Record<string, string> }}
 */
export function validateIngredient(input) {
  const errors = {};

  const name = String(input.name ?? '').trim();
  if (!name) errors.name = 'Informe o nome do ingrediente.';
  else if (name.length < 2) errors.name = 'Nome deve ter ao menos 2 caracteres.';
  else if (name.length > 120) errors.name = 'Nome muito longo.';

  const category = String(input.category ?? '').trim();
  if (category.length > 80) errors.category = 'Categoria muito longa.';

  const unit = String(input.unit ?? '').trim();
  if (!UNIT_VALUES.has(unit)) errors.unit = 'Selecione uma unidade válida.';

  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    errors.quantity = 'Quantidade deve ser zero ou maior.';
  }

  const minStock = Number(input.minStock);
  if (!Number.isFinite(minStock) || minStock < 0) {
    errors.minStock = 'Estoque mínimo deve ser zero ou maior.';
  }

  const currentCost = Number(input.currentCost);
  if (!Number.isFinite(currentCost) || currentCost < 0) {
    errors.currentCost = 'Custo deve ser zero ou maior.';
  }

  const status = input.status === 'inactive' ? 'inactive' : 'active';

  let lastPurchaseAt = input.lastPurchaseAt || null;
  if (lastPurchaseAt) {
    const d = new Date(lastPurchaseAt);
    if (Number.isNaN(d.getTime())) {
      errors.lastPurchaseAt = 'Data da última compra inválida.';
      lastPurchaseAt = null;
    } else {
      lastPurchaseAt = d.toISOString().slice(0, 10);
    }
  }

  const supplierName = String(input.supplierName ?? '').trim() || null;

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      category: category || null,
      unit,
      quantity,
      minStock,
      currentCost,
      supplierId: input.supplierId || null,
      supplierName,
      lastPurchaseAt,
      status,
    },
  };
}

export function getStockLevel(quantity, minStock) {
  const qty = Number(quantity) || 0;
  const min = Number(minStock) || 0;
  if (min <= 0) return qty <= 0 ? 'critical' : 'normal';
  if (qty <= min * 0.6) return 'critical';
  if (qty <= min) return 'low';
  return 'normal';
}
