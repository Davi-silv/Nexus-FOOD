import { assertCompanyScope } from '@/services/company.service.js';
import {
  validateFinanceCategory,
  validatePayable,
  validateReceivable,
  validateTransaction,
} from '@/validations/finance.validation.js';
import { uid } from '@/core/utils/helpers.js';

function key(companyId, suffix) {
  return `nexus-food:finance:${suffix}:${companyId}`;
}

function read(companyId, suffix, fallback = null) {
  try {
    const raw = localStorage.getItem(key(companyId, suffix));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(companyId, suffix, rows) {
  localStorage.setItem(key(companyId, suffix), JSON.stringify(rows));
}

function seedCategories(companyId) {
  const now = new Date().toISOString();
  return [
    { id: 'cat_vendas', companyId, name: 'Vendas balcão', type: 'income', active: true, createdAt: now },
    { id: 'cat_delivery', companyId, name: 'Delivery', type: 'income', active: true, createdAt: now },
    { id: 'cat_ifood', companyId, name: 'iFood / apps', type: 'income', active: true, createdAt: now },
    { id: 'cat_compras', companyId, name: 'Compras de insumos', type: 'expense', active: true, createdAt: now },
    { id: 'cat_folha', companyId, name: 'Folha / pessoal', type: 'expense', active: true, createdAt: now },
    { id: 'cat_aluguel', companyId, name: 'Aluguel', type: 'expense', active: true, createdAt: now },
    { id: 'cat_util', companyId, name: 'Água / luz / gás', type: 'expense', active: true, createdAt: now },
    { id: 'cat_desp', companyId, name: 'Desperdício / perdas', type: 'expense', active: true, createdAt: now },
    { id: 'cat_outros_e', companyId, name: 'Outras despesas', type: 'expense', active: true, createdAt: now },
  ];
}

function seedTransactions(companyId) {
  const now = new Date();
  const iso = (daysAgo, hour = 12) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };
  const mk = (partial) => ({
    id: uid('tx'),
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  });

  return [
    mk({ type: 'income', description: 'Vendas balcão', amount: 1847.5, date: iso(0), paymentMethod: 'pix', categoryId: 'cat_vendas' }),
    mk({ type: 'income', description: 'Delivery WhatsApp', amount: 920, date: iso(0), paymentMethod: 'delivery', categoryId: 'cat_delivery' }),
    mk({ type: 'income', description: 'Vendas balcão', amount: 2100, date: iso(1), paymentMethod: 'cash', categoryId: 'cat_vendas' }),
    mk({ type: 'income', description: 'iFood', amount: 1580, date: iso(1), paymentMethod: 'delivery', categoryId: 'cat_ifood' }),
    mk({ type: 'income', description: 'Vendas balcão', amount: 2450, date: iso(2), paymentMethod: 'credit', categoryId: 'cat_vendas' }),
    mk({ type: 'income', description: 'Vendas balcão', amount: 1980, date: iso(3), paymentMethod: 'pix', categoryId: 'cat_vendas' }),
    mk({ type: 'income', description: 'Delivery', amount: 1100, date: iso(4), paymentMethod: 'delivery', categoryId: 'cat_delivery' }),
    mk({ type: 'income', description: 'Sábado — pico', amount: 4200, date: iso(5), paymentMethod: 'pix', categoryId: 'cat_vendas' }),
    mk({ type: 'income', description: 'Domingo', amount: 3100, date: iso(6), paymentMethod: 'debit', categoryId: 'cat_vendas' }),
    mk({ type: 'expense', description: 'Compra de carne', amount: 2145, date: iso(2), paymentMethod: 'pix', categoryId: 'cat_compras' }),
    mk({ type: 'expense', description: 'Aluguel', amount: 4500, date: iso(10), paymentMethod: 'pix', categoryId: 'cat_aluguel' }),
    mk({ type: 'expense', description: 'Energia elétrica', amount: 890, date: iso(8), paymentMethod: 'debit', categoryId: 'cat_util' }),
    mk({ type: 'expense', description: 'Folha quinzena', amount: 6200, date: iso(4), paymentMethod: 'pix', categoryId: 'cat_folha' }),
  ];
}

function seedPayables(companyId) {
  const now = new Date();
  const due = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return [
    {
      id: 'ap_1',
      companyId,
      description: 'Carnes Premium — fatura quinzenal',
      amount: 3200,
      paidAmount: 0,
      dueDate: due(5),
      status: 'pending',
      supplierName: 'Carnes Premium Ltda',
      categoryId: 'cat_compras',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'ap_2',
      companyId,
      description: 'Aluguel loja',
      amount: 4500,
      paidAmount: 0,
      dueDate: due(12),
      status: 'pending',
      supplierName: null,
      categoryId: 'cat_aluguel',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

function seedReceivables(companyId) {
  const now = new Date();
  const due = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return [
    {
      id: 'ar_1',
      companyId,
      description: 'Evento corporativo — buffet',
      amount: 2800,
      receivedAmount: 0,
      dueDate: due(7),
      status: 'pending',
      customerName: 'Empresa Alpha',
      categoryId: 'cat_vendas',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
}

function ensureSeed(companyId) {
  if (read(companyId, 'categories', null) === null) {
    write(companyId, 'categories', seedCategories(companyId));
  }
  if (read(companyId, 'transactions', null) === null) {
    write(companyId, 'transactions', seedTransactions(companyId));
  }
  if (read(companyId, 'payables', null) === null) {
    write(companyId, 'payables', seedPayables(companyId));
  }
  if (read(companyId, 'receivables', null) === null) {
    write(companyId, 'receivables', seedReceivables(companyId));
  }
}

export function listFinanceCategories(companyId, type = null) {
  if (!companyId) return [];
  ensureSeed(companyId);
  let rows = (read(companyId, 'categories', []) || []).filter((c) => c.companyId === companyId);
  if (type) rows = rows.filter((c) => c.type === type);
  return rows.filter((c) => c.active !== false);
}

export function listTransactions(companyId) {
  if (!companyId) return [];
  ensureSeed(companyId);
  return (read(companyId, 'transactions', []) || [])
    .filter((t) => t.companyId === companyId)
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function createTransaction(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  ensureSeed(companyId);
  const validated = validateTransaction(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }
  const now = new Date().toISOString();
  const row = {
    id: uid('tx'),
    companyId,
    ...validated.data,
    createdAt: now,
    updatedAt: now,
  };
  const rows = listTransactions(companyId);
  write(companyId, 'transactions', [row, ...rows]);
  return row;
}

export function deleteTransaction(companyId, id) {
  const rows = listTransactions(companyId);
  const found = rows.find((r) => r.id === id);
  if (!found) throw new Error('Lançamento não encontrado.');
  assertCompanyScope(companyId, found.companyId);
  write(
    companyId,
    'transactions',
    rows.filter((r) => r.id !== id),
  );
}

export function listPayables(companyId) {
  if (!companyId) return [];
  ensureSeed(companyId);
  return (read(companyId, 'payables', []) || [])
    .filter((p) => p.companyId === companyId)
    .slice()
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

export function createPayable(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  ensureSeed(companyId);
  const validated = validatePayable(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }
  const now = new Date().toISOString();
  const row = {
    id: uid('ap'),
    companyId,
    ...validated.data,
    paidAmount: validated.data.paidAmount || 0,
    createdAt: now,
    updatedAt: now,
  };
  write(companyId, 'payables', [row, ...listPayables(companyId)]);
  return row;
}

export function markPayablePaid(companyId, id, { paymentDate = null, paymentMethod = 'pix' } = {}) {
  const rows = listPayables(companyId);
  const index = rows.findIndex((p) => p.id === id);
  if (index < 0) throw new Error('Conta a pagar não encontrada.');
  assertCompanyScope(companyId, rows[index].companyId);

  const item = rows[index];
  const paidAt = paymentDate || new Date().toISOString().slice(0, 10);
  const updated = {
    ...item,
    status: 'paid',
    paidAmount: item.amount,
    paymentDate: paidAt,
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  write(companyId, 'payables', next);

  createTransaction(companyId, {
    type: 'expense',
    description: `Pagamento: ${item.description}`,
    amount: item.amount,
    date: paidAt,
    paymentMethod,
    categoryId: item.categoryId || 'cat_compras',
    notes: `Conta a pagar ${item.id}`,
  });

  return updated;
}

export function listReceivables(companyId) {
  if (!companyId) return [];
  ensureSeed(companyId);
  return (read(companyId, 'receivables', []) || [])
    .filter((r) => r.companyId === companyId)
    .slice()
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
}

export function createReceivable(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  ensureSeed(companyId);
  const validated = validateReceivable(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }
  const now = new Date().toISOString();
  const row = {
    id: uid('ar'),
    companyId,
    ...validated.data,
    receivedAmount: validated.data.receivedAmount || 0,
    createdAt: now,
    updatedAt: now,
  };
  write(companyId, 'receivables', [row, ...listReceivables(companyId)]);
  return row;
}

export function markReceivableReceived(
  companyId,
  id,
  { receivedDate = null, paymentMethod = 'pix' } = {},
) {
  const rows = listReceivables(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Conta a receber não encontrada.');
  assertCompanyScope(companyId, rows[index].companyId);

  const item = rows[index];
  const when = receivedDate || new Date().toISOString().slice(0, 10);
  const updated = {
    ...item,
    status: 'received',
    receivedAmount: item.amount,
    receivedDate: when,
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  write(companyId, 'receivables', next);

  createTransaction(companyId, {
    type: 'income',
    description: `Recebimento: ${item.description}`,
    amount: item.amount,
    date: when,
    paymentMethod,
    categoryId: item.categoryId || 'cat_vendas',
    notes: `Conta a receber ${item.id}`,
  });

  return updated;
}

function inMonth(dateStr, ref = new Date()) {
  const d = String(dateStr || '');
  const prefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  return d.startsWith(prefix);
}

function isToday(dateStr) {
  return String(dateStr || '') === new Date().toISOString().slice(0, 10);
}

export function getFinanceSummary(companyId) {
  const txs = listTransactions(companyId);
  const payables = listPayables(companyId);
  const receivables = listReceivables(companyId);

  const incomeMonth = txs
    .filter((t) => t.type === 'income' && inMonth(t.date))
    .reduce((s, t) => s + t.amount, 0);
  const expenseMonth = txs
    .filter((t) => t.type === 'expense' && inMonth(t.date))
    .reduce((s, t) => s + t.amount, 0);
  const incomeToday = txs
    .filter((t) => t.type === 'income' && isToday(t.date))
    .reduce((s, t) => s + t.amount, 0);
  const expenseToday = txs
    .filter((t) => t.type === 'expense' && isToday(t.date))
    .reduce((s, t) => s + t.amount, 0);

  const payablesPending = payables
    .filter((p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial')
    .reduce((s, p) => s + (p.amount - (p.paidAmount || 0)), 0);
  const receivablesPending = receivables
    .filter((r) => r.status === 'pending' || r.status === 'overdue' || r.status === 'partial')
    .reduce((s, r) => s + (r.amount - (r.receivedAmount || 0)), 0);

  return {
    incomeToday,
    expenseToday,
    incomeMonth,
    expenseMonth,
    balanceMonth: incomeMonth - expenseMonth,
    profitMonth: incomeMonth - expenseMonth,
    payablesPending,
    receivablesPending,
    txsCount: txs.length,
  };
}

/** Série diária de receitas dos últimos N dias */
export function getRevenueSeries(companyId, days = 7) {
  const txs = listTransactions(companyId).filter((t) => t.type === 'income');
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const value = txs.filter((t) => t.date === key).reduce((s, t) => s + t.amount, 0);
    series.push({ label, value, date: key });
  }
  return series;
}

export function resetFinance(companyId) {
  if (!companyId) return;
  ['categories', 'transactions', 'payables', 'receivables'].forEach((suffix) => {
    localStorage.removeItem(key(companyId, suffix));
  });
}

// create category helper for future UI
export function createFinanceCategory(companyId, payload) {
  ensureSeed(companyId);
  const validated = validateFinanceCategory(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }
  const row = {
    id: uid('cat'),
    companyId,
    ...validated.data,
    createdAt: new Date().toISOString(),
  };
  write(companyId, 'categories', [...listFinanceCategories(companyId), row]);
  return row;
}
