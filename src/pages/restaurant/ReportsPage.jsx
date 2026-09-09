import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  buildReport,
  DATE_PRESETS,
  REPORT_TYPES,
} from '@/services/reports.service.js';
import { formatMoney, formatNumber } from '@/core/utils/money.js';

function cellValue(row, col) {
  const v = row[col.key];
  if (v == null || v === '') return '—';
  if (col.money) return formatMoney(Number(v) || 0);
  if (typeof v === 'number') return formatNumber(v);
  return String(v);
}

export function ReportsPage() {
  const { company } = useAuth();
  const companyId = company?.id;

  const [type, setType] = useState('finance');
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const report = useMemo(
    () =>
      buildReport(companyId, type, {
        preset,
        from,
        to,
        idealCmv: company?.idealCmv || 32,
      }),
    [companyId, type, preset, from, to, company?.idealCmv],
  );

  return (
    <AppShell title="Relatórios" subtitle="Financeiro, estoque, CMV, margem e operação">
      <div className="segmented mb-3 report-types">
        {REPORT_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={type === t.key ? 'is-active' : ''}
            onClick={() => setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="mb-3">
        <CardHeader title="Período" subtitle={`${report.range.from} → ${report.range.to}`} />
        <div className="segmented">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={preset === p.key ? 'is-active' : ''}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="form-grid mt-3">
            <label className="form-field">
              <span>De</span>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Até</span>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}
      </Card>

      {report.kpis.length > 0 && (
        <section className="kpi-grid">
          {report.kpis.map((k) => (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.money ? k.value : k.value}
              money={Boolean(k.money)}
              tone={k.tone || 'neutral'}
            />
          ))}
        </section>
      )}

      <Card>
        <CardHeader
          title={report.title}
          subtitle={report.summary || `${report.rows.length} linhas`}
          action={<Badge tone="info">{company?.tradeName || company?.name}</Badge>}
        />
        {report.rows.length === 0 ? (
          <EmptyState
            title="Sem dados no período"
            description="Ajuste o filtro de datas ou cadastre movimentos neste módulo."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {report.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, idx) => (
                  <tr key={idx}>
                    {report.columns.map((c) => (
                      <td key={c.key}>{cellValue(row, c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
