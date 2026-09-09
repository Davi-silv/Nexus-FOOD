import { WASTE_REASONS } from '@/core/constants.js';

/**
 * @param {Record<string, unknown>} input
 */
export function validateWaste(input) {
  const errors = {};

  const ingredientId = String(input.ingredientId ?? '').trim();
  if (!ingredientId) errors.ingredientId = 'Selecione o ingrediente.';

  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = 'Quantidade deve ser maior que zero.';
  }

  const reason = String(input.reason ?? '').trim();
  const allowed = new Set(WASTE_REASONS.map((r) => r.value));
  if (!allowed.has(reason)) errors.reason = 'Selecione o motivo.';

  const wasteDate = String(input.wasteDate ?? '').trim() || new Date().toISOString().slice(0, 10);
  const employeeName = String(input.employeeName ?? '').trim() || null;
  const notes = String(input.notes ?? '').trim() || null;
  if (notes && notes.length > 500) errors.notes = 'Observação muito longa.';

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      ingredientId,
      quantity,
      reason,
      wasteDate,
      employeeName,
      notes,
    },
  };
}
