import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { WASTE_REASONS } from '@/core/constants.js';
import { listIngredients } from '@/services/ingredients.service.js';
import {
  createWasteRecord,
  getWasteStats,
  listWasteRecords,
} from '@/services/waste.service.js';
import { formatMoney, formatNumber } from '@/core/utils/money.js';

export function WastePage() {
  const { company, user } = useAuth();
  const toast = useToast();
  const companyId = company?.id;

  const [tick, setTick] = useState(0);
  const records = useMemo(() => (companyId ? listWasteRecords(companyId) : []), [companyId, tick]);
  const stats = useMemo(() => (companyId ? getWasteStats(companyId) : null), [companyId, tick]);
  const ingredients = useMemo(
    () => (companyId ? listIngredients(companyId).filter((i) => i.status === 'active') : []),
    [companyId, tick],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('expiration');
  const [wasteDate, setWasteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employeeName, setEmployeeName] = useState('');
  const [notes, setNotes] = useState('');

  function openCreate() {
    setIngredientId(ingredients[0]?.id || '');
    setQuantity('1');
    setReason('expiration');
    setWasteDate(new Date().toISOString().slice(0, 10));
    setEmployeeName(user?.name || '');
    setNotes('');
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      createWasteRecord(companyId, {
        ingredientId,
        quantity: Number(quantity),
        reason,
        wasteDate,
        employeeName,
        notes,
      });
      toast.success('Desperdício registrado — estoque atualizado.');
      setModalOpen(false);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível registrar o desperdício.');
    } finally {
      setSaving(false);
    }
  }

  const selected = ingredients.find((i) => i.id === ingredientId);
  const previewLoss =
    selected && Number(quantity) > 0
      ? Number(quantity) * (Number(selected.currentCost) || 0)
      : 0;

  return (
    <AppShell title="Desperdícios" subtitle="Valor financeiro perdido">
      <section className="kpi-grid">
        <KpiCard label="Hoje" value={stats?.today || 0} money tone="waste" />
        <KpiCard label="Semana" value={stats?.week || 0} money tone="cost" />
        <KpiCard label="Mês" value={stats?.month || 0} money tone="waste" />
        <KpiCard label="Registros" value={stats?.count || 0} />
      </section>

      <div className="recipes-layout">
        <Card>
          <CardHeader
            title="Registros"
            subtitle={`${records.length} · ${company?.tradeName || ''}`}
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Novo desperdício
              </Button>
            }
          />

          {records.length === 0 ? (
            <EmptyState
              title="Nenhum desperdício"
              description="Registre perdas para medir o impacto no lucro."
              action={
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  Registrar
                </Button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Ingrediente</th>
                    <th>Qtd</th>
                    <th>Motivo</th>
                    <th>Funcionário</th>
                    <th>Valor perdido</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {new Date(`${r.wasteDate}T12:00:00`).toLocaleDateString('pt-BR')}
                      </td>
                      <td>{r.ingredientName}</td>
                      <td>
                        {formatNumber(r.quantity)} {r.unit}
                      </td>
                      <td>
                        <Badge tone="warning">{r.reasonLabel}</Badge>
                      </td>
                      <td>{r.employeeName || '—'}</td>
                      <td className="text-cost">{formatMoney(r.totalLoss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Ranking do mês" subtitle="Onde mais se perde dinheiro" />
          {!stats?.ranking?.length ? (
            <p className="muted">Sem dados no mês atual.</p>
          ) : (
            <ol className="rank-list">
              {stats.ranking.slice(0, 8).map((row, idx) => (
                <li key={row.ingredientId}>
                  <span className="rank-list__pos">{idx + 1}.</span>
                  <div>
                    <strong>{row.name}</strong>
                    <p className="muted">{formatNumber(row.quantity)} unidades/kg equiv.</p>
                  </div>
                  <strong className="text-cost">{formatMoney(row.totalLoss)}</strong>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Modal
        open={modalOpen}
        title="Registrar desperdício"
        onClose={() => !saving && setModalOpen(false)}
      >
        <form className="form-grid" onSubmit={handleSave}>
          <label className="form-field span-2">
            <span>Ingrediente *</span>
            <select
              className="input"
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} — {formatNumber(ing.quantity)} {ing.unit}
                </option>
              ))}
            </select>
            {fieldErrors.ingredientId ? (
              <em className="field-error">{fieldErrors.ingredientId}</em>
            ) : null}
          </label>
          <label className="form-field">
            <span>Quantidade *</span>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {fieldErrors.quantity ? <em className="field-error">{fieldErrors.quantity}</em> : null}
          </label>
          <label className="form-field">
            <span>Motivo *</span>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {WASTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Data</span>
            <input
              className="input"
              type="date"
              value={wasteDate}
              onChange={(e) => setWasteDate(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Funcionário</span>
            <input
              className="input"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
            />
          </label>
          <label className="form-field span-2">
            <span>Observação</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <p className="muted span-2">
            Valor estimado perdido: <strong className="text-cost">{formatMoney(previewLoss)}</strong>
          </p>
          <div className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
