import { getFinanceSummary, getRevenueSeries, listTransactions } from '@/services/finance.service.js';
import { getInventoryStats, listStockPositions } from '@/services/inventory.service.js';
import { getWasteStats } from '@/services/waste.service.js';
import { listRecipes } from '@/services/recipes.service.js';
import { listProducts } from '@/services/products.service.js';
import { DEMO_DASHBOARD, isDemoCompany } from '@/data/demo.js';

/**
 * Agrega KPIs reais do restaurante.
 * Fallback DEMO_DASHBOARD só para a empresa de demonstração (showcase).
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
  const useDemoFallback = isDemoCompany(companyId);

  const incomeTxMonth = txs.filter((t) => t.type === 'income' && isCurrentMonth(t.date));
  const ordersProxy = Math.max(incomeTxMonth.length, 1);
  const avgTicket = finance.incomeMonth > 0 ? finance.incomeMonth / ordersProxy : 0;

  const avgCmv =
    recipes.length > 0
      ? recipes.reduce((s, r) => s + (r.cmvPercent || 0), 0) / recipes.length
      : useDemoFallback
        ? DEMO_DASHBOARD.cmvPercent
        : 0;

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
    const qty = useDemoFallback ? 80 + (4 - i) * 40 : 0;
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
    revenueToday: finance.incomeToday || (useDemoFallback ? DEMO_DASHBOARD.revenueToday : 0),
    revenueMonth: finance.incomeMonth || (useDemoFallback ? DEMO_DASHBOARD.revenueMonth : 0),
    ordersToday:
      txs.filter((t) => t.type === 'income' && isToday(t.date)).length ||
      (useDemoFallback ? DEMO_DASHBOARD.ordersToday : 0),
    avgTicket: avgTicket || (useDemoFallback ? DEMO_DASHBOARD.avgTicket : 0),
    costsMonth: finance.expenseMonth || (useDemoFallback ? DEMO_DASHBOARD.costsMonth : 0),
    grossProfitMonth:
      finance.incomeMonth || finance.expenseMonth
        ? finance.balanceMonth
        : useDemoFallback
          ? DEMO_DASHBOARD.grossProfitMonth
          : 0,
    cmvPercent: avgCmv,
    wasteMonth: waste.month || (useDemoFallback ? DEMO_DASHBOARD.wasteMonth : 0),
    stockValue: inventory.stockValue || (useDemoFallback ? DEMO_DASHBOARD.stockValue : 0),
    payablesPending:
      finance.payablesPending || (useDemoFallback ? DEMO_DASHBOARD.payablesPending : 0),
    receivablesPending: finance.receivablesPending || 0,
    revenueSeries:
      hasRealRevenue || !useDemoFallback ? revenueSeries : DEMO_DASHBOARD.revenueSeries,
    topSold: topSold.length || !useDemoFallback ? topSold : DEMO_DASHBOARD.topSold,
    topMargin: topMargin.length || !useDemoFallback ? topMargin : DEMO_DASHBOARD.topMargin,
    criticalStock:
      criticalStock.length || !useDemoFallback ? criticalStock : DEMO_DASHBOARD.criticalStock,
    alerts: alerts.length || !useDemoFallback ? alerts : DEMO_DASHBOARD.alerts,
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
