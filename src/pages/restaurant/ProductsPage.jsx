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
import { ProductForm } from '@/components/products/ProductForm.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { useProducts } from '@/hooks/useProducts.js';
import { formatMoney } from '@/core/utils/money.js';

export function ProductsPage() {
  const { company } = useAuth();
  const toast = useToast();
  const { items, loading, error, stats, create, update, deactivate, reactivate } =
    useProducts(company?.id);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(items.map((p) => p.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter === 'active' && p.status !== 'active') return false;
      if (statusFilter === 'inactive' && p.status !== 'inactive') return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
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
        toast.success('Produto atualizado com sucesso.');
      } else {
        await create(payload);
        toast.success('Produto cadastrado com sucesso.');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirmDeactivate) return;
    setSaving(true);
    try {
      await deactivate(confirmDeactivate.id);
      toast.success('Produto desativado.');
      setConfirmDeactivate(null);
    } catch (err) {
      toast.error(err.message || 'Não foi possível desativar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(product) {
    try {
      await reactivate(product.id);
      toast.success('Produto reativado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível reativar.');
    }
  }

  return (
    <AppShell title="Produtos" subtitle="Itens vendidos no cardápio">
      <section className="kpi-grid">
        <KpiCard label="Ativos" value={stats.total} tone="profit" />
        <KpiCard label="Disponíveis" value={stats.available} tone="stock" />
        <KpiCard label="Indisponíveis" value={stats.unavailable} tone="cost" />
      </section>

      <Card>
        <CardHeader
          title="Cadastro de produtos"
          subtitle={`${rows.length} exibidos · ${company?.tradeName || company?.name || ''}`}
          action={
            <div className="toolbar">
              <input
                className="input"
                placeholder="Buscar produto…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                className="input input--sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filtrar categoria"
              >
                <option value="all">Todas categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
                Novo produto
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
            title="Nenhum produto encontrado"
            description="Cadastre o cardápio para montar fichas técnicas e acompanhar margem."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Cadastrar produto
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
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Preço</th>
                  <th>Disponível</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="product-thumb" />
                        ) : (
                          <span className="product-thumb product-thumb--empty" aria-hidden="true" />
                        )}
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td className="cell-muted">
                      {p.description
                        ? p.description.length > 60
                          ? `${p.description.slice(0, 60)}…`
                          : p.description
                        : '—'}
                    </td>
                    <td>{formatMoney(p.salePrice)}</td>
                    <td>
                      <Badge tone={p.available ? 'success' : 'warning'}>
                        {p.available ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>
                        {p.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(p)}
                          aria-label={`Editar ${p.name}`}
                        >
                          <Pencil size={15} />
                        </Button>
                        {p.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeactivate(p)}
                            aria-label={`Desativar ${p.name}`}
                          >
                            <Trash2 size={15} />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(p)}
                            aria-label={`Reativar ${p.name}`}
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
        title={editing ? 'Editar produto' : 'Novo produto'}
        onClose={closeModal}
      >
        <ProductForm
          initial={editing}
          fieldErrors={fieldErrors}
          onSubmit={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      <Modal
        open={Boolean(confirmDeactivate)}
        title="Desativar produto"
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
            <Button onClick={handleDeactivate} loading={saving}>
              Desativar
            </Button>
          </>
        }
      >
        <p className="prose">
          Deseja desativar <strong>{confirmDeactivate?.name}</strong>? Ele sai do cardápio
          ativo e pode ser reativado depois.
        </p>
      </Modal>
    </AppShell>
  );
}
