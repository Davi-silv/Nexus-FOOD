const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

export function formatMoney(value) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatPercent(value, digits = 1) {
  return `${numberFormatter.format(Number(value) || 0)}%`;
}

export function parseMoneyInput(raw) {
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Margem % = (venda - custo) / venda * 100
 */
export function calcMarginPercent(salePrice, cost) {
  const sale = Number(salePrice) || 0;
  const c = Number(cost) || 0;
  if (sale <= 0) return 0;
  return ((sale - c) / sale) * 100;
}

/**
 * Markup = venda / custo
 */
export function calcMarkup(salePrice, cost) {
  const sale = Number(salePrice) || 0;
  const c = Number(cost) || 0;
  if (c <= 0) return 0;
  return sale / c;
}

/**
 * CMV % = custo / venda * 100
 */
export function calcCmvPercent(cost, salePrice) {
  const sale = Number(salePrice) || 0;
  const c = Number(cost) || 0;
  if (sale <= 0) return 0;
  return (c / sale) * 100;
}
