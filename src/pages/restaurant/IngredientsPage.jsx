import { useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { IngredientForm } from '@/components/ingredients/IngredientForm.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useIngredients } from '@/hooks/useIngredients.js';
import { formatMoney, formatNumber } from '@/core/utils/money.js';
import { STOCK_STATUS, UNITS } from '@/core/constants.js';

function unitLabel(value) {
  return UNITS.find((u) => u.value === value)?.label || value;
}

export function IngredientsPage() {
  const { company } = useAuth();
  const toast = useToast();
  const { items, loading, error, stats, create, update, deactivate, reactivate } =
    useIngredients(company?.id);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((ing) => {
      if (statusFilter === 'active' && ing.status !== 'active') return false;
      if (statusFilter === 'inactive' && ing.status !== 'inactive') return false;
      if (!q) return true;
      return (
        ing.name.toLowerCase().includes(q) ||
        (ing.category || '').toLowerCase().includes(q) ||
        (ing.supplierName || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  function openCreate() {
    setEditing(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(ing) {
    setEditing(ing);
    setFieldErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setFieldErrors({});
  }

  async function handleSave(payload) {
    setSaving(true);
    setFieldErrors({});
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success('Ingrediente atualizado com sucesso.');
      } else {
        await create(payload);
        toast.success('Ingrediente cadastrado com sucesso.');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar o ingrediente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirmDeactivate) return;
    setSaving(true);
    try {
      await deactivate(confirmDeactivate.id);
      toast.success('Ingrediente desativado.');
      setConfirmDeactivate(null);
    } catch (err) {
      toast.error(err.message || 'Não foi possível desativar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(ing) {
    try {
      await reactivate(ing.id);
      toast.success('Ingrediente reativado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível reativar.');
    }
  }

  return (
    <AppShell title="Ingredientes" subtitle="Base de custos e estoque">
      <section className="kpi-grid">
        <KpiCard label="Ativos" value={stats.total} tone="stock" />
        <KpiCard label="Estoque baixo" value={stats.low} tone="cost" />
        <KpiCard label="Estoque crítico" value={stats.critical} tone="waste" />
      </section>

      <Card>
        <CardHeader
          title="Cadastro de ingredientes"
          subtitle={`${rows.length} exibidos · ${company?.tradeName || company?.name || ''}`}
          action={
            <div className="toolbar">
              <input
                className="input"
                placeholder="Buscar por nome, categoria…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="input input--sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrar status"
              >
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="all">Todos</option>
              </select>
              <Button onClick={openCreate}>
                <Plus size={16} />
                Novo ingrediente
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="stack-gap">
            <Skeleton height={18} />
            <Skeleton height={18} />
            <Skeleton height={18} />
          </div>
        ) : null}

        {error ? <p className="field-error">{error}</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="Nenhum ingrediente encontrado"
            description="Cadastre o primeiro ingrediente para calcular custos e controlar estoque."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Cadastrar ingrediente
              </Button>
            }
          />
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Qtd atual</th>
                  <th>Mínimo</th>
                  <th>Custo</th>
                  <th>Fornecedor</th>
                  <th>Última compra</th>
                  <th>Estoque</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.map((ing) => (
                  <tr key={ing.id}>
                    <td>
                      <strong>{ing.name}</strong>
                    </td>
                    <td>{ing.category || '—'}</td>
                    <td>{unitLabel(ing.unit)}</td>
                    <td>
                      {formatNumber(ing.quantity)} {ing.unit}
                    </td>
                    <td>{formatNumber(ing.minStock)}</td>
                    <td>{formatMoney(ing.currentCost)}</td>
                    <td>{ing.supplierName || '—'}</td>
                    <td>
                      {ing.lastPurchaseAt
                        ? new Date(`${ing.lastPurchaseAt}T12:00:00`).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td>
                      <Badge tone={STOCK_STATUS[ing.level].tone}>
                        {STOCK_STATUS[ing.level].label}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={ing.status === 'active' ? 'success' : 'neutral'}>
                        {ing.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ing)}
                          aria-label={`Editar ${ing.name}`}
                        >
                          <Pencil size={15} />
                        </Button>
                        {ing.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeactivate(ing)}
                            aria-label={`Desativar ${ing.name}`}
                          >
                            <Trash2 size={15} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(ing)}
                            aria-label={`Reativar ${ing.name}`}
                          >
                            <RotateCcw size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar ingrediente' : 'Novo ingrediente'}
        onClose={closeModal}
      >
        <IngredientForm
          initial={editing}
          fieldErrors={fieldErrors}
          onSubmit={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      <Modal
        open={Boolean(confirmDeactivate)}
        title="Desativar ingrediente"
        onClose={() => !saving && setConfirmDeactivate(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmDeactivate(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDeactivate} loading={saving}>
              Desativar
            </Button>
          </>
        }
      >
        <p className="prose">
          Deseja desativar <strong>{confirmDeactivate?.name}</strong>? O registro permanece
          disponível para histórico e pode ser reativado depois.
        </p>
      </Modal>
    </AppShell>
  );
}
