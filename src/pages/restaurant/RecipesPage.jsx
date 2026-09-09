import { useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { RecipeForm } from '@/components/recipes/RecipeForm.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useRecipes } from '@/hooks/useRecipes.js';
import { listIngredients } from '@/services/ingredients.service.js';
import { listProducts } from '@/services/products.service.js';
import { formatMoney, formatPercent } from '@/core/utils/money.js';

export function RecipesPage() {
  const { company } = useAuth();
  const toast = useToast();
  const { items, history, loading, error, stats, save, remove, refresh } = useRecipes(company?.id);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const products = useMemo(
    () => (company?.id ? listProducts(company.id) : []),
    [company?.id, items],
  );
  const ingredients = useMemo(
    () => (company?.id ? listIngredients(company.id) : []),
    [company?.id, items],
  );

  const productsWithRecipe = useMemo(() => items.map((r) => r.productId), [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (!q) return true;
      return (
        r.productName.toLowerCase().includes(q) ||
        (r.productCategory || '').toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const selected = useMemo(
    () => items.find((r) => r.id === (selectedId || rows[0]?.id)) || null,
    [items, selectedId, rows],
  );

  function openCreate() {
    setEditing(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(recipe) {
    setEditing(recipe);
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
      const saved = await save(payload, editing?.id || null);
      toast.success(editing ? 'Ficha técnica atualizada.' : 'Ficha técnica salva com sucesso.');
      setModalOpen(false);
      setEditing(null);
      setSelectedId(saved.id);
      refresh();
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar a ficha técnica.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await remove(confirmDelete.id);
      toast.success('Ficha técnica removida.');
      if (selectedId === confirmDelete.id) setSelectedId(null);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Ficha Técnica" subtitle="Custo, margem, markup e CMV por produto">
      <section className="kpi-grid">
        <KpiCard label="Fichas" value={stats.total} tone="stock" />
        <KpiCard
          label="Margem média"
          value={formatPercent(stats.avgMargin)}
          tone="profit"
        />
        <KpiCard label="CMV médio" value={formatPercent(stats.avgCmv)} tone="cost" />
        <KpiCard
          label="Maior margem"
          value={stats.topMargin ? stats.topMargin.productName : '—'}
          hint={stats.topMargin ? formatPercent(stats.topMargin.marginPercent) : undefined}
          tone="profit"
        />
      </section>

      <div className="recipes-layout">
        <Card>
          <CardHeader
            title="Produtos com ficha"
            subtitle={`${rows.length} · ${company?.tradeName || ''}`}
            action={
              <div className="toolbar">
                <input
                  className="input"
                  placeholder="Buscar produto…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  Nova ficha
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
              title="Nenhuma ficha técnica"
              description="Monte a receita de cada produto para descobrir o custo real e a margem."
              action={
                <Button onClick={openCreate}>
                  <Plus size={16} />
                  Criar ficha
                </Button>
              }
            />
          ) : null}

          {!loading && rows.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Custo</th>
                    <th>Venda</th>
                    <th>Margem</th>
                    <th>CMV</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={selected?.id === r.id ? 'is-selected' : ''}
                      onClick={() => setSelectedId(r.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong>{r.productName}</strong>
                        <div className="cell-muted">{r.productCategory || '—'}</div>
                      </td>
                      <td>{formatMoney(r.totalCost)}</td>
                      <td>{formatMoney(r.salePrice)}</td>
                      <td>
                        <Badge tone={r.marginPercent >= 60 ? 'success' : 'warning'}>
                          {formatPercent(r.marginPercent)}
                        </Badge>
                      </td>
                      <td>{formatPercent(r.cmvPercent)}</td>
                      <td>
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(r)}
                            aria-label={`Editar ${r.productName}`}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(r)}
                            aria-label={`Remover ${r.productName}`}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title={selected ? selected.productName : 'Detalhe da ficha'}
            subtitle={
              selected
                ? 'Composição e indicadores de lucro'
                : 'Selecione um produto à esquerda'
            }
            action={selected ? <BookOpen size={18} className="muted" /> : null}
          />

          {!selected ? (
            <EmptyState
              title="Nenhuma ficha selecionada"
              description="Clique em um produto para ver ingredientes, custo e margem."
            />
          ) : (
            <>
              <div className="recipe-metrics-grid">
                <div>
                  <span>Custo total</span>
                  <strong>{formatMoney(selected.totalCost)}</strong>
                </div>
                <div>
                  <span>Preço de venda</span>
                  <strong>{formatMoney(selected.salePrice)}</strong>
                </div>
                <div>
                  <span>Lucro bruto</span>
                  <strong className="text-profit">{formatMoney(selected.grossProfit)}</strong>
                </div>
                <div>
                  <span>Margem</span>
                  <strong>{formatPercent(selected.marginPercent)}</strong>
                </div>
                <div>
                  <span>Markup</span>
                  <strong>{selected.markup.toFixed(2)}x</strong>
                </div>
                <div>
                  <span>CMV</span>
                  <strong>{formatPercent(selected.cmvPercent)}</strong>
                </div>
              </div>

              <div className="table-wrap mt-4">
                <table>
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th>Qtd</th>
                      <th>Custo unit.</th>
                      <th>Custo linha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.itemsDetailed.map((line) => (
                      <tr key={`${selected.id}-${line.ingredientId}`}>
                        <td>
                          {line.ingredientName}
                          {line.missing ? (
                            <Badge tone="danger">Ausente</Badge>
                          ) : null}
                        </td>
                        <td>
                          {line.quantity} {line.unit}
                        </td>
                        <td>
                          {formatMoney(line.unitCost)}/{line.ingredientUnit}
                        </td>
                        <td>{formatMoney(line.lineCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Histórico de custo"
          subtitle="Alterações por edição de ficha ou preço de ingrediente"
        />
        {history.length === 0 ? (
          <p className="muted">Nenhuma alteração registrada ainda.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Produto</th>
                  <th>Motivo</th>
                  <th>Antes</th>
                  <th>Depois</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      {new Date(h.createdAt).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>{h.productName}</td>
                    <td>
                      {h.reason === 'ingredient_price_change'
                        ? 'Preço do ingrediente'
                        : h.reason === 'product_price_change'
                          ? 'Preço de venda'
                          : 'Edição da ficha'}
                    </td>
                    <td>{formatMoney(h.previousCost)}</td>
                    <td>{formatMoney(h.newCost)}</td>
                    <td className={h.delta > 0 ? 'text-cost' : 'text-profit'}>
                      {h.delta > 0 ? '+' : ''}
                      {formatMoney(h.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar ficha técnica' : 'Nova ficha técnica'}
        onClose={closeModal}
      >
        <RecipeForm
          initial={editing}
          products={products}
          ingredients={ingredients}
          productsWithRecipe={productsWithRecipe}
          fieldErrors={fieldErrors}
          onSubmit={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        title="Remover ficha técnica"
        onClose={() => !saving && setConfirmDelete(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} loading={saving}>
              Remover
            </Button>
          </>
        }
      >
        <p className="prose">
          Remover a ficha de <strong>{confirmDelete?.productName}</strong>? O produto permanece
          cadastrado.
        </p>
      </Modal>
    </AppShell>
  );
}
