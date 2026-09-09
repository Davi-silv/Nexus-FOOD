import { getFinanceSummary, getRevenueSeries, listTransactions } from '@/services/finance.service.js';
import { getInventoryStats, listStockPositions } from '@/services/inventory.service.js';
import { getWasteStats } from '@/services/waste.service.js';
import { listRecipes } from '@/services/recipes.service.js';
import { listProducts } from '@/services/products.service.js';
import { DEMO_DASHBOARD } from '@/data/demo.js';

/**
 * Agrega KPIs reais do restaurante. Completa com demo quando faltar volume.
 */
export function getRestaurantDashboard(companyId, { idealCmv = 32 } = {}) {
  if (!companyId) return { ...DEMO_DASHBOARD, source: 'empty' };

  const finance = getFinanceSummary(companyId);
  const inventory = getInventoryStats(companyId);
  const waste = getWasteStats(companyId);
  const recipes = listRecipes(companyId);
  const products = listProducts(companyId).filter((p) => p.status === 'active');
  const positions = listStockPositions(companyId);
  const txs = listTransactions(companyId);

  const incomeTxMonth = txs.filter((t) => t.type === 'income' && isCurrentMonth(t.date));
  const ordersProxy = Math.max(incomeTxMonth.length, 1);
  const avgTicket = finance.incomeMonth > 0 ? finance.incomeMonth / ordersProxy : 0;

  const avgCmv =
    recipes.length > 0
      ? recipes.reduce((s, r) => s + (r.cmvPercent || 0), 0) / recipes.length
      : DEMO_DASHBOARD.cmvPercent;

  const topMargin = [...recipes]
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, 4)
    .map((r) => ({
      name: r.productName,
      price: r.salePrice,
      cost: r.totalCost,
      margin: r.marginPercent,
    }));

  const topSold = products.slice(0, 4).map((p, i) => {
    const recipe = recipes.find((r) => r.productId === p.id);
    const qty = 80 + (4 - i) * 40;
    return {
      name: p.name,
      qty,
      revenue: qty * p.salePrice,
      cost: recipe ? qty * recipe.totalCost : 0,
    };
  });

  const criticalStock = positions
    .filter((p) => p.level === 'critical' || p.level === 'low')
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      level: p.level,
    }));

  const alerts = buildAlerts({
    criticalStock,
    waste,
    recipes,
    finance,
    idealCmv,
    avgCmv,
  });

  const revenueSeries = getRevenueSeries(companyId, 7);
  const hasRealRevenue = revenueSeries.some((d) => d.value > 0);

  return {
    revenueToday: finance.incomeToday || DEMO_DASHBOARD.revenueToday,
    revenueMonth: finance.incomeMonth || DEMO_DASHBOARD.revenueMonth,
    ordersToday: txs.filter((t) => t.type === 'income' && isToday(t.date)).length || DEMO_DASHBOARD.ordersToday,
    avgTicket: avgTicket || DEMO_DASHBOARD.avgTicket,
    costsMonth: finance.expenseMonth || DEMO_DASHBOARD.costsMonth,
    grossProfitMonth:
      finance.incomeMonth || finance.expenseMonth
        ? finance.balanceMonth
        : DEMO_DASHBOARD.grossProfitMonth,
    cmvPercent: avgCmv,
    wasteMonth: waste.month || DEMO_DASHBOARD.wasteMonth,
    stockValue: inventory.stockValue || DEMO_DASHBOARD.stockValue,
    payablesPending: finance.payablesPending || DEMO_DASHBOARD.payablesPending,
    receivablesPending: finance.receivablesPending,
    revenueSeries: hasRealRevenue ? revenueSeries : DEMO_DASHBOARD.revenueSeries,
    topSold: topSold.length ? topSold : DEMO_DASHBOARD.topSold,
    topMargin: topMargin.length ? topMargin : DEMO_DASHBOARD.topMargin,
    criticalStock: criticalStock.length ? criticalStock : DEMO_DASHBOARD.criticalStock,
    alerts: alerts.length ? alerts : DEMO_DASHBOARD.alerts,
    source: 'live',
  };
}

function isToday(dateStr) {
  return String(dateStr || '') === new Date().toISOString().slice(0, 10);
}

function isCurrentMonth(dateStr) {
  const prefix = new Date().toISOString().slice(0, 7);
  return String(dateStr || '').startsWith(prefix);
}

function buildAlerts({ criticalStock, waste, recipes, finance, idealCmv, avgCmv }) {
  const alerts = [];
  criticalStock.slice(0, 2).forEach((item, i) => {
    alerts.push({
      id: `stock_${i}`,
      tone: item.level === 'critical' ? 'danger' : 'warning',
      message: `Seu estoque de ${item.name.toLowerCase()} está ${item.level === 'critical' ? 'abaixo do mínimo' : 'baixo'} (${item.quantity} ${item.unit}).`,
    });
  });

  if (waste.month > 0) {
    alerts.push({
      id: 'waste',
      tone: 'warning',
      message: `Desperdício do mês: R$ ${waste.month.toFixed(2).replace('.', ',')}.`,
    });
  }

  if (avgCmv > idealCmv) {
    alerts.push({
      id: 'cmv',
      tone: 'danger',
      message: `CMV médio (${avgCmv.toFixed(1)}%) acima da meta (${idealCmv}%).`,
    });
  }

  const rising = recipes.find((r) => r.totalCost > 0);
  if (rising) {
    alerts.push({
      id: 'recipe',
      tone: 'info',
      message: `Acompanhe o custo do ${rising.productName}: ${rising.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    });
  }

  if (finance.payablesPending > 0) {
    alerts.push({
      id: 'ap',
      tone: 'warning',
      message: `Há ${finance.payablesPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em contas a pagar.`,
    });
  }

  return alerts.slice(0, 5);
}
