import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { getRestaurantDashboard } from '@/services/dashboard.service.js';
import { getRevenueSeries } from '@/services/finance.service.js';
import { formatMoney, formatPercent } from '@/core/utils/money.js';

const RANGE_OPTIONS = [
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
];

export function DashboardPage() {
  const { company } = useAuth();
  const [range, setRange] = useState('7');

  const data = useMemo(
    () => getRestaurantDashboard(company?.id, { idealCmv: company?.idealCmv || 32 }),
    [company?.id, company?.idealCmv],
  );

  const chartData = useMemo(() => {
    const days = Number(range) || 7;
    if (days === 7 && data.revenueSeries?.length) return data.revenueSeries;
    if (!company?.id) return data.revenueSeries || [];
    return getRevenueSeries(company.id, days).map((d) => ({
      ...d,
      label:
        days > 30
          ? new Date(`${d.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          : d.label,
    }));
  }, [range, data, company?.id]);

  return (
    <AppShell
      title="Dashboard"
      subtitle={`${company?.tradeName || company?.name || 'Restaurante'} — visão rápida do lucro`}
    >
      <section className="kpi-grid">
        <KpiCard label="Faturamento hoje" value={data.revenueToday} money tone="profit" />
        <KpiCard label="Faturamento mês" value={data.revenueMonth} money tone="profit" />
        <KpiCard label="Pedidos / vendas" value={data.ordersToday} hint={`Ticket médio ${formatMoney(data.avgTicket)}`} />
        <KpiCard label="Custos (mês)" value={data.costsMonth} money tone="cost" />
        <KpiCard label="Lucro bruto" value={data.grossProfitMonth} money tone="profit" />
        <KpiCard
          label="CMV"
          value={formatPercent(data.cmvPercent)}
          tone={data.cmvPercent > (company?.idealCmv || 32) ? 'danger' : 'neutral'}
        />
        <KpiCard label="Desperdício do mês" value={data.wasteMonth} money tone="waste" />
        <KpiCard label="Valor do estoque" value={data.stockValue} money tone="stock" />
        <KpiCard label="Contas a pagar" value={data.payablesPending} money tone="cost" />
      </section>

      <section className="dashboard-grid">
        <Card className="span-2">
          <CardHeader
            title="Faturamento"
            subtitle="Curva de receitas (dados financeiros)"
            action={
              <div className="segmented">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={range === opt.key ? 'is-active' : ''}
                    onClick={() => setRange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0F766E"
                  fill="url(#revFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Alertas" subtitle="O que precisa da sua atenção" />
          <ul className="alert-list">
            {data.alerts.map((alert) => (
              <li key={alert.id} className={`alert-item alert-item--${alert.tone}`}>
                {alert.message}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card>
          <CardHeader title="Produtos em destaque" subtitle="Estimativa por cardápio ativo" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.topSold.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.qty}</td>
                    <td>{formatMoney(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Produtos mais lucrativos" subtitle="Via ficha técnica" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Preço</th>
                  <th>Custo</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {data.topMargin.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{formatMoney(row.price)}</td>
                    <td>{formatMoney(row.cost)}</td>
                    <td>
                      <Badge tone="success">{formatPercent(row.margin)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Estoque crítico" />
          <ul className="stock-list">
            {data.criticalStock.map((item) => (
              <li key={item.name}>
                <span className={`stock-dot stock-dot--${item.level}`} aria-hidden="true" />
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <Badge tone={item.level === 'critical' ? 'danger' : 'warning'}>
                  {item.level === 'critical' ? 'Crítico' : 'Baixo'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}
