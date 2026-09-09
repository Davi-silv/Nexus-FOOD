import { PAYMENT_METHODS } from '@/core/constants.js';

/**
 * @param {Record<string, unknown>} input
 */
export function validatePurchase(input) {
  const errors = {};

  const supplierId = String(input.supplierId ?? '').trim() || null;
  const purchaseDate = String(input.purchaseDate ?? '').trim();
  if (!purchaseDate) errors.purchaseDate = 'Informe a data da compra.';

  const paymentMethod = String(input.paymentMethod ?? '').trim() || 'pix';
  const allowed = new Set(PAYMENT_METHODS.map((p) => p.value));
  if (!allowed.has(paymentMethod)) errors.paymentMethod = 'Forma de pagamento inválida.';

  const status = String(input.status ?? 'confirmed');
  if (!['pending', 'confirmed', 'paid', 'parcelado', 'cancelled'].includes(status)) {
    errors.status = 'Status inválido.';
  }

  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) errors.items = 'Adicione ao menos um item.';

  const items = [];
  rawItems.forEach((item, index) => {
    const ingredientId = String(item.ingredientId ?? '').trim();
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!ingredientId) {
      errors[`item_${index}_ingredient`] = 'Ingrediente obrigatório.';
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors[`item_${index}_quantity`] = 'Quantidade inválida.';
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors[`item_${index}_unitPrice`] = 'Preço unitário inválido.';
      return;
    }
    items.push({
      ingredientId,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    });
  });

  if (Object.keys(errors).length) return { ok: false, errors };

  const total = items.reduce((s, i) => s + i.total, 0);
  return {
    ok: true,
    data: {
      supplierId,
      purchaseDate,
      paymentMethod,
      status,
      notes: String(input.notes ?? '').trim() || null,
      items,
      total,
    },
  };
}
