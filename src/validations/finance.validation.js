import { PAYMENT_METHODS } from '@/core/constants.js';

export function validateFinanceCategory(input) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  if (!name) errors.name = 'Informe o nome da categoria.';
  const type = input.type === 'income' ? 'income' : 'expense';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, type, active: input.active !== false } };
}

export function validateTransaction(input) {
  const errors = {};
  const type = input.type === 'income' ? 'income' : input.type === 'expense' ? 'expense' : null;
  if (!type) errors.type = 'Tipo inválido.';

  const description = String(input.description ?? '').trim();
  if (!description) errors.description = 'Informe a descrição.';

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Valor deve ser maior que zero.';

  const date = String(input.date ?? '').trim();
  if (!date) errors.date = 'Informe a data.';

  const paymentMethod = String(input.paymentMethod ?? 'pix');
  if (!PAYMENT_METHODS.some((p) => p.value === paymentMethod)) {
    errors.paymentMethod = 'Forma de pagamento inválida.';
  }

  const categoryId = String(input.categoryId ?? '').trim() || null;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      type,
      description,
      amount,
      date,
      paymentMethod,
      categoryId,
      notes: String(input.notes ?? '').trim() || null,
    },
  };
}

export function validatePayable(input) {
  const errors = {};
  const description = String(input.description ?? '').trim();
  if (!description) errors.description = 'Informe a descrição.';
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Valor inválido.';
  const dueDate = String(input.dueDate ?? '').trim();
  if (!dueDate) errors.dueDate = 'Informe o vencimento.';
  const status = ['pending', 'paid', 'overdue', 'partial', 'cancelled'].includes(input.status)
    ? input.status
    : 'pending';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      description,
      amount,
      dueDate,
      status,
      supplierId: input.supplierId || null,
      supplierName: input.supplierName || null,
      categoryId: input.categoryId || null,
      notes: String(input.notes ?? '').trim() || null,
      paidAmount: Number(input.paidAmount) || 0,
      paymentDate: input.paymentDate || null,
    },
  };
}

export function validateReceivable(input) {
  const errors = {};
  const description = String(input.description ?? '').trim();
  if (!description) errors.description = 'Informe a descrição.';
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Valor inválido.';
  const dueDate = String(input.dueDate ?? '').trim();
  if (!dueDate) errors.dueDate = 'Informe o vencimento.';
  const status = ['pending', 'received', 'overdue', 'partial', 'cancelled'].includes(input.status)
    ? input.status
    : 'pending';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      description,
      amount,
      dueDate,
      status,
      customerName: String(input.customerName ?? '').trim() || null,
      categoryId: input.categoryId || null,
      notes: String(input.notes ?? '').trim() || null,
      receivedAmount: Number(input.receivedAmount) || 0,
      receivedDate: input.receivedDate || null,
    },
  };
}
