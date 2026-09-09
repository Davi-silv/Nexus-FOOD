import { listTransactions, listPayables, listReceivables } from '@/services/finance.service.js';
import { listStockPositions, listInventoryMovements, getInventoryStats } from '@/services/inventory.service.js';
import { listWasteRecords } from '@/services/waste.service.js';
import { listSuppliers, listIngredientPriceHistory } from '@/services/suppliers.service.js';
import { listPurchases } from '@/services/purchases.service.js';
import { listProducts } from '@/services/products.service.js';
import { listRecipes } from '@/services/recipes.service.js';

export const REPORT_TYPES = [
  { key: 'finance', label: 'Financeiro' },
  { key: 'stock', label: 'Estoque' },
  { key: 'waste', label: 'Desperdício' },
  { key: 'suppliers', label: 'Fornecedores' },
  { key: 'purchases', label: 'Compras' },
  { key: 'products', label: 'Produtos' },
  { key: 'margin', label: 'Margem' },
  { key: 'cmv', label: 'CMV' },
];

export const DATE_PRESETS = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'month', label: 'Mês atual' },
  { key: 'last_month', label: 'Mês anterior' },
  { key: 'custom', label: 'Personalizado' },
];

/** Resolve intervalo inclusivo YYYY-MM-DD */
export function resolveDateRange(preset, customFrom = '', customTo = '') {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const toKey = (d) => d.toISOString().slice(0, 10);

  if (preset === 'custom') {
    const from = customFrom || toKey(today);
    const to = customTo || from;
    return from <= to ? { from, to } : { from: to, to: from };
  }

  if (preset === 'today') {
    const k = toKey(today);
    return { from: k, to: k };
  }

  if (preset === '7d' || preset === '30d') {
    const days = preset === '7d' ? 6 : 29;
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    return { from: toKey(from), to: toKey(today) };
  }

  if (preset === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toKey(from), to: toKey(today) };
  }

  if (preset === 'last_month') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toKey(from), to: toKey(to) };
  }

  return { from: toKey(today), to: toKey(today) };
}

function inRange(dateStr, range) {
  const d = String(dateStr || '').slice(0, 10);
  return d >= range.from && d <= range.to;
}

/**
 * Gera um relatório agregado por tipo e período.
 * @returns {{ type, range, title, kpis, columns, rows, summary }}
 */
export function buildReport(companyId, type, { preset = 'month', from = '', to = '', idealCmv = 32 } = {}) {
  if (!companyId) {
    return emptyReport(type, resolveDateRange(preset, from, to));
  }

  const range = resolveDateRange(preset, from, to);

  switch (type) {
    case 'finance':
      return financeReport(companyId, range);
    case 'stock':
      return stockReport(companyId, range);
    case 'waste':
      return wasteReport(companyId, range);
    case 'suppliers':
      return suppliersReport(companyId, range);
    case 'purchases':
      return purchasesReport(companyId, range);
    case 'products':
      return productsReport(companyId, range);
    case 'margin':
      return marginReport(companyId, range);
    case 'cmv':
      return cmvReport(companyId, range, idealCmv);
    default:
      return emptyReport(type, range);
  }
}

function emptyReport(type, range) {
  return {
    type,
    range,
    title: REPORT_TYPES.find((t) => t.key === type)?.label || 'Relatório',
    kpis: [],
    columns: [],
    rows: [],
    summary: '',
  };
}

function financeReport(companyId, range) {
  const txs = listTransactions(companyId).filter((t) => inRange(t.date, range));
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const payables = listPayables(companyId).filter(
    (p) => p.status !== 'paid' && inRange(p.dueDate, range),
  );
  const receivables = listReceivables(companyId).filter(
    (r) => r.status !== 'received' && inRange(r.dueDate, range),
  );

  return {
    type: 'finance',
    range,
    title: 'Relatório financeiro',
    kpis: [
      { label: 'Receitas', value: income, money: true, tone: 'profit' },
      { label: 'Despesas', value: expense, money: true, tone: 'cost' },
      { label: 'Saldo', value: income - expense, money: true, tone: 'profit' },
      { label: 'Lançamentos', value: txs.length },
    ],
    columns: [
      { key: 'date', label: 'Data' },
      { key: 'type', label: 'Tipo' },
      { key: 'description', label: 'Descrição' },
      { key: 'paymentMethod', label: 'Pagamento' },
      { key: 'amount', label: 'Valor', money: true },
    ],
    rows: txs
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((t) => ({
        date: t.date,
        type: t.type === 'income' ? 'Receita' : 'Despesa',
        description: t.description,
        paymentMethod: t.paymentMethod,
        amount: t.amount,
      })),
    summary: `AP no período: ${payables.length} · AR no período: ${receivables.length}`,
  };
}

function stockReport(companyId, range) {
  const positions = listStockPositions(companyId);
  const stats = getInventoryStats(companyId);
  const movements = listInventoryMovements(companyId, { limit: 500 }).filter((m) =>
    inRange(m.createdAt?.slice(0, 10) || m.date, range),
  );

  return {
    type: 'stock',
    range,
    title: 'Relatório de estoque',
    kpis: [
      { label: 'Valor em estoque', value: stats.stockValue || 0, money: true, tone: 'stock' },
      { label: 'Itens', value: positions.length },
      { label: 'Críticos / baixos', value: positions.filter((p) => p.level !== 'ok').length, tone: 'danger' },
      { label: 'Movimentos no período', value: movements.length },
    ],
    columns: [
      { key: 'name', label: 'Ingrediente' },
      { key: 'quantity', label: 'Qtd' },
      { key: 'unit', label: 'Un' },
      { key: 'minStock', label: 'Mín' },
      { key: 'value', label: 'Valor', money: true },
      { key: 'level', label: 'Nível' },
    ],
    rows: positions.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      minStock: p.minStock,
      value: p.stockValue ?? p.quantity * (p.currentCost || 0),
      level: p.level,
    })),
    summary: `${movements.length} movimentações no período selecionado.`,
  };
}

function wasteReport(companyId, range) {
  const records = listWasteRecords(companyId).filter((r) => inRange(r.wasteDate, range));
  const total = records.reduce((s, r) => s + (r.totalLoss || 0), 0);

  return {
    type: 'waste',
    range,
    title: 'Relatório de desperdício',
    kpis: [
      { label: 'Perda no período', value: total, money: true, tone: 'waste' },
      { label: 'Registros', value: records.length },
      {
        label: 'Maior perda',
        value: records.reduce((m, r) => Math.max(m, r.totalLoss || 0), 0),
        money: true,
        tone: 'cost',
      },
    ],
    columns: [
      { key: 'wasteDate', label: 'Data' },
      { key: 'ingredientName', label: 'Ingrediente' },
      { key: 'quantity', label: 'Qtd' },
      { key: 'reason', label: 'Motivo' },
      { key: 'totalLoss', label: 'Perda', money: true },
      { key: 'employeeName', label: 'Responsável' },
    ],
    rows: records
      .slice()
      .sort((a, b) => String(b.wasteDate).localeCompare(String(a.wasteDate)))
      .map((r) => ({
        wasteDate: r.wasteDate,
        ingredientName: r.ingredientName,
        quantity: `${r.quantity} ${r.unit || ''}`.trim(),
        reason: r.reasonLabel || r.reason,
        totalLoss: r.totalLoss,
        employeeName: r.employeeName || '—',
      })),
    summary: '',
  };
}

function suppliersReport(companyId, range) {
  const suppliers = listSuppliers(companyId);
  const history = listIngredientPriceHistory(companyId, { limit: 200 }).filter((h) =>
    inRange(h.createdAt?.slice(0, 10) || h.date, range),
  );

  return {
    type: 'suppliers',
    range,
    title: 'Relatório de fornecedores',
    kpis: [
      { label: 'Fornecedores', value: suppliers.length },
      { label: 'Ativos', value: suppliers.filter((s) => s.status === 'active').length, tone: 'profit' },
      { label: 'Mudanças de preço', value: history.length, tone: 'info' },
    ],
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'document', label: 'Documento' },
      { key: 'phone', label: 'Telefone' },
      { key: 'status', label: 'Status' },
    ],
    rows: suppliers.map((s) => ({
      name: s.name,
      document: s.document || '—',
      phone: s.phone || '—',
      status: s.status,
    })),
    summary: `${history.length} alterações de preço no período.`,
  };
}

function purchasesReport(companyId, range) {
  const purchases = listPurchases(companyId).filter((p) =>
    inRange(p.purchaseDate || p.createdAt?.slice(0, 10), range),
  );
  const total = purchases.reduce((s, p) => s + (p.total || 0), 0);
  const confirmed = purchases.filter((p) =>
    ['confirmed', 'paid', 'parcelado'].includes(p.status),
  );

  return {
    type: 'purchases',
    range,
    title: 'Relatório de compras',
    kpis: [
      { label: 'Total comprado', value: total, money: true, tone: 'cost' },
      { label: 'Pedidos', value: purchases.length },
      { label: 'Confirmados', value: confirmed.length, tone: 'profit' },
    ],
    columns: [
      { key: 'purchaseDate', label: 'Data' },
      { key: 'supplierName', label: 'Fornecedor' },
      { key: 'status', label: 'Status' },
      { key: 'itemsCount', label: 'Itens' },
      { key: 'total', label: 'Total', money: true },
    ],
    rows: purchases
      .slice()
      .sort((a, b) =>
        String(b.purchaseDate || '').localeCompare(String(a.purchaseDate || '')),
      )
      .map((p) => ({
        purchaseDate: p.purchaseDate || p.createdAt?.slice(0, 10),
        supplierName: p.supplierName || '—',
        status: p.status,
        itemsCount: p.items?.length || 0,
        total: p.total,
      })),
    summary: '',
  };
}

function productsReport(companyId, range) {
  const products = listProducts(companyId);
  const recipes = listRecipes(companyId);
  void range;

  return {
    type: 'products',
    range,
    title: 'Relatório de produtos',
    kpis: [
      { label: 'Produtos', value: products.length },
      { label: 'Ativos', value: products.filter((p) => p.status === 'active').length, tone: 'profit' },
      { label: 'Com ficha', value: recipes.length, tone: 'info' },
    ],
    columns: [
      { key: 'name', label: 'Produto' },
      { key: 'category', label: 'Categoria' },
      { key: 'salePrice', label: 'Preço', money: true },
      { key: 'cost', label: 'Custo', money: true },
      { key: 'margin', label: 'Margem %' },
      { key: 'status', label: 'Status' },
    ],
    rows: products.map((p) => {
      const recipe = recipes.find((r) => r.productId === p.id);
      return {
        name: p.name,
        category: p.category,
        salePrice: p.salePrice,
        cost: recipe?.totalCost ?? null,
        margin: recipe?.marginPercent != null ? Number(recipe.marginPercent).toFixed(1) : '—',
        status: p.status,
      };
    }),
    summary: 'Custo e margem vindos da ficha técnica quando existir.',
  };
}

function marginReport(companyId, range) {
  const recipes = [...listRecipes(companyId)].sort((a, b) => b.marginPercent - a.marginPercent);
  void range;
  const avg =
    recipes.length > 0
      ? recipes.reduce((s, r) => s + (r.marginPercent || 0), 0) / recipes.length
      : 0;

  return {
    type: 'margin',
    range,
    title: 'Relatório de margem',
    kpis: [
      { label: 'Margem média', value: `${avg.toFixed(1)}%`, tone: 'profit' },
      { label: 'Fichas', value: recipes.length },
      {
        label: 'Melhor margem',
        value: recipes[0] ? `${recipes[0].marginPercent.toFixed(1)}%` : '—',
        tone: 'profit',
      },
    ],
    columns: [
      { key: 'productName', label: 'Produto' },
      { key: 'salePrice', label: 'Preço', money: true },
      { key: 'totalCost', label: 'Custo', money: true },
      { key: 'grossProfit', label: 'Lucro', money: true },
      { key: 'marginPercent', label: 'Margem %' },
      { key: 'markup', label: 'Markup' },
    ],
    rows: recipes.map((r) => ({
      productName: r.productName,
      salePrice: r.salePrice,
      totalCost: r.totalCost,
      grossProfit: r.grossProfit,
      marginPercent: Number(r.marginPercent).toFixed(1),
      markup: Number(r.markup).toFixed(2),
    })),
    summary: '',
  };
}

function cmvReport(companyId, range, idealCmv) {
  const recipes = [...listRecipes(companyId)].sort((a, b) => b.cmvPercent - a.cmvPercent);
  void range;
  const avg =
    recipes.length > 0
      ? recipes.reduce((s, r) => s + (r.cmvPercent || 0), 0) / recipes.length
      : 0;
  const above = recipes.filter((r) => r.cmvPercent > idealCmv).length;

  return {
    type: 'cmv',
    range,
    title: 'Relatório de CMV',
    kpis: [
      { label: 'CMV médio', value: `${avg.toFixed(1)}%`, tone: avg > idealCmv ? 'danger' : 'profit' },
      { label: 'Meta ideal', value: `${idealCmv}%` },
      { label: 'Acima da meta', value: above, tone: above ? 'danger' : 'profit' },
    ],
    columns: [
      { key: 'productName', label: 'Produto' },
      { key: 'totalCost', label: 'Custo', money: true },
      { key: 'salePrice', label: 'Venda', money: true },
      { key: 'cmvPercent', label: 'CMV %' },
      { key: 'status', label: 'vs meta' },
    ],
    rows: recipes.map((r) => ({
      productName: r.productName,
      totalCost: r.totalCost,
      salePrice: r.salePrice,
      cmvPercent: Number(r.cmvPercent).toFixed(1),
      status: r.cmvPercent > idealCmv ? 'Acima' : 'Ok',
    })),
    summary: `Meta configurável da empresa: ${idealCmv}%.`,
  };
}
