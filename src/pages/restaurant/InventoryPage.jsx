import { useMemo, useState } from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { InventoryMovementForm } from '@/components/inventory/InventoryMovementForm.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useInventory } from '@/hooks/useInventory.js';
import { listIngredients } from '@/services/ingredients.service.js';
import { INVENTORY_MOVEMENT_TYPES, STOCK_STATUS } from '@/core/constants.js';
import { formatMoney, formatNumber } from '@/core/utils/money.js';

function typeLabel(type) {
  return INVENTORY_MOVEMENT_TYPES.find((t) => t.value === type)?.label || type;
}

export function InventoryPage() {
  const { company } = useAuth();
  const toast = useToast();
  const { positions, movements, stats, loading, error, registerMovement } = useInventory(
    company?.id,
  );

  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillIngredientId, setPrefillIngredientId] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const ingredients = useMemo(
    () => (company?.id ? listIngredients(company.id).filter((i) => i.status === 'active') : []),
    [company?.id, positions],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return positions.filter((p) => {
      if (levelFilter !== 'all' && p.level !== levelFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [positions, query, levelFilter]);

  function openMovement(ingredientId = '') {
    setPrefillIngredientId(ingredientId);
    setFieldErrors({});
    setModalOpen(true);
  }

  async function handleSave(payload) {
    setSaving(true);
    setFieldErrors({});
    try {
      await registerMovement(payload);
      toast.success('Estoque atualizado.');
      setModalOpen(false);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível registrar a movimentação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Estoque" subtitle="Entradas, saídas e histórico obrigatório">
      <section className="kpi-grid">
        <KpiCard label="Itens ativos" value={stats.totalItems} tone="stock" />
        <KpiCard label="Valor em estoque" value={stats.stockValue} money tone="profit" />
        <KpiCard label="Baixo" value={stats.low} tone="cost" />
        <KpiCard label="Crítico" value={stats.critical} tone="waste" />
      </section>

      <Card>
        <CardHeader
          title="Posição de estoque"
          subtitle={`${rows.length} itens · ${company?.tradeName || ''}`}
          action={
            <div className="toolbar">
              <input
                className="input"
                placeholder="Buscar ingrediente…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="input input--sm"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                aria-label="Filtrar status"
              >
                <option value="all">Todos</option>
                <option value="critical">Crítico</option>
                <option value="low">Baixo</option>
                <option value="normal">Normal</option>
              </select>
              <Button onClick={() => openMovement('')}>
                <Plus size={16} />
                Movimentação
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="stack-gap">
            <Skeleton height={18} />
            <Skeleton height={18} />
          </div>
        ) : null}
        {error ? <p className="field-error">{error}</p> : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            title="Nenhum item em estoque"
            description="Cadastre ingredientes e registre a primeira movimentação."
            action={
              <Button onClick={() => openMovement('')}>
                <Plus size={16} />
                Registrar movimentação
              </Button>
            }
          />
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Qtd atual</th>
                  <th>Mínimo</th>
                  <th>Valor</th>
                  <th>Última movimentação</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.ingredientId}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="cell-muted">{p.category || '—'}</div>
                    </td>
                    <td>
                      {formatNumber(p.quantity)} {p.unit}
                    </td>
                    <td>
                      {formatNumber(p.minStock)} {p.unit}
                    </td>
                    <td>{formatMoney(p.stockValue)}</td>
                    <td className="cell-muted">
                      {p.lastMovement
                        ? `${typeLabel(p.lastMovement.type)} · ${new Date(
                            p.lastMovement.createdAt,
                          ).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}`
                        : '—'}
                    </td>
                    <td>
                      <Badge tone={STOCK_STATUS[p.level].tone}>
                        {STOCK_STATUS[p.level].label}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMovement(p.ingredientId)}
                        aria-label={`Movimentar ${p.name}`}
                      >
                        <ArrowLeftRight size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Histórico de movimentações"
          subtitle="Toda alteração de quantidade gera registro"
        />
        {movements.length === 0 ? (
          <p className="muted">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ingrediente</th>
                  <th>Tipo</th>
                  <th>Qtd</th>
                  <th>Antes → Depois</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {new Date(m.createdAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>{m.ingredientName}</td>
                    <td>
                      <Badge
                        tone={
                          m.type === 'perda' || m.type === 'saida' || m.type === 'consumo'
                            ? 'warning'
                            : m.type === 'ajuste'
                              ? 'info'
                              : 'success'
                        }
                      >
                        {typeLabel(m.type)}
                      </Badge>
                    </td>
                    <td>
                      {m.signedDelta > 0 ? '+' : m.signedDelta < 0 ? '−' : ''}
                      {formatNumber(Math.abs(m.signedDelta ?? m.quantity))} {m.unit}
                    </td>
                    <td>
                      {formatNumber(m.balanceBefore)} → {formatNumber(m.balanceAfter)}
                    </td>
                    <td className="cell-muted">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} title="Registrar movimentação" onClose={() => !saving && setModalOpen(false)}>
        <InventoryMovementForm
          ingredients={ingredients}
          initialIngredientId={prefillIngredientId}
          fieldErrors={fieldErrors}
          onSubmit={handleSave}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </AppShell>
  );
}
