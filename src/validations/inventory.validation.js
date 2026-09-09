import { INVENTORY_MOVEMENT_TYPES } from '@/core/constants.js';

const TYPE_SET = new Set(INVENTORY_MOVEMENT_TYPES.map((t) => t.value || t));

/**
 * Normaliza lista de tipos (string[] legado ou {value,label}[]).
 */
function typeValues() {
  return INVENTORY_MOVEMENT_TYPES.map((t) => (typeof t === 'string' ? t : t.value));
}

/**
 * @param {Record<string, unknown>} input
 */
export function validateInventoryMovement(input) {
  const errors = {};
  const types = typeValues();

  const ingredientId = String(input.ingredientId ?? '').trim();
  if (!ingredientId) errors.ingredientId = 'Selecione o ingrediente.';

  const type = String(input.type ?? '').trim();
  if (!types.includes(type)) errors.type = 'Tipo de movimentação inválido.';

  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity)) {
    errors.quantity = 'Informe a quantidade.';
  } else if (type === 'ajuste') {
    if (quantity < 0) errors.quantity = 'Estoque ajustado não pode ser negativo.';
  } else if (quantity <= 0) {
    errors.quantity = 'Quantidade deve ser maior que zero.';
  }

  const notes = String(input.notes ?? '').trim();
  if (notes.length > 500) errors.notes = 'Observação muito longa.';

  let unitCost = input.unitCost;
  if (unitCost === '' || unitCost === null || unitCost === undefined) {
    unitCost = null;
  } else {
    unitCost = Number(unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      errors.unitCost = 'Custo unitário inválido.';
    }
  }

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      ingredientId,
      type,
      quantity,
      unitCost,
      notes: notes || null,
      referenceType: input.referenceType || null,
      referenceId: input.referenceId || null,
    },
  };
}

export { typeValues as inventoryTypeValues };
