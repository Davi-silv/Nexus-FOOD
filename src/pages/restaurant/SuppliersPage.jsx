import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { listIngredients } from '@/services/ingredients.service.js';
import {
  createSupplier,
  deactivateSupplier,
  listIngredientPriceHistory,
  listSuppliers,
  updateSupplier,
} from '@/services/suppliers.service.js';
import { formatMoney, formatPercent } from '@/core/utils/money.js';

const EMPTY = {
  name: '',
  document: '',
  phone: '',
  whatsapp: '',
  email: '',
  contactName: '',
  notes: '',
  status: 'active',
  ingredientIds: [],
};

export function SuppliersPage() {
  const { company } = useAuth();
  const toast = useToast();
  const companyId = company?.id;

  const [tick, setTick] = useState(0);
  const suppliers = useMemo(() => (companyId ? listSuppliers(companyId) : []), [companyId, tick]);
  const ingredients = useMemo(
    () => (companyId ? listIngredients(companyId).filter((i) => i.status === 'active') : []),
    [companyId, tick],
  );
  const priceHistory = useMemo(
    () => (companyId ? listIngredientPriceHistory(companyId, { limit: 20 }) : []),
    [companyId, tick],
  );

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (s.status !== 'active' && !q) return false;
      if (!q) return s.status === 'active';
      return (
        s.name.toLowerCase().includes(q) ||
        (s.document || '').includes(q) ||
        (s.contactName || '').toLowerCase().includes(q)
      );
    });
  }, [suppliers, query]);

  function openCreate() {
    setEditing(null);
    setValues(EMPTY);
    setFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditing(s);
    setValues({
      name: s.name || '',
      document: s.document || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      contactName: s.contactName || '',
      notes: s.notes || '',
      status: s.status || 'active',
      ingredientIds: s.ingredientIds || [],
    });
    setFieldErrors({});
    setModalOpen(true);
  }

  function toggleIngredient(id) {
    setValues((prev) => {
      const set = new Set(prev.ingredientIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, ingredientIds: [...set] };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      if (editing) {
        updateSupplier(companyId, editing.id, values);
        toast.success('Fornecedor atualizado.');
      } else {
        createSupplier(companyId, values);
        toast.success('Fornecedor cadastrado com sucesso.');
      }
      setModalOpen(false);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeactivate(s) {
    try {
      deactivateSupplier(companyId, s.id);
      toast.success('Fornecedor desativado.');
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const ingredientName = (id) => ingredients.find((i) => i.id === id)?.name || id;

  return (
    <AppShell title="Fornecedores" subtitle="Cadastro e histórico de preços">
      <Card>
        <CardHeader
          title="Fornecedores"
          subtitle={`${rows.length} · ${company?.tradeName || ''}`}
          action={
            <div className="toolbar">
              <input
                className="input"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button onClick={openCreate}>
                <Plus size={16} />
                Novo fornecedor
              </Button>
            </div>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor"
            description="Cadastre quem abastece o restaurante."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Cadastrar
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>WhatsApp</th>
                  <th>Produtos</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      {s.email ? <div className="cell-muted">{s.email}</div> : null}
                    </td>
                    <td>{s.document || '—'}</td>
                    <td>{s.contactName || '—'}</td>
                    <td>{s.whatsapp || s.phone || '—'}</td>
                    <td className="cell-muted">
                      {(s.ingredientIds || []).slice(0, 3).map(ingredientName).join(', ') || '—'}
                      {(s.ingredientIds || []).length > 3 ? '…' : ''}
                    </td>
                    <td>
                      <Badge tone={s.status === 'active' ? 'success' : 'neutral'}>
                        {s.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          <Pencil size={15} />
                        </Button>
                        {s.status === 'active' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(s)}>
                            <Trash2 size={15} />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Histórico de preços"
          subtitle="Ex.: carne bovina — variação entre compras"
        />
        {priceHistory.length === 0 ? (
          <p className="muted">Nenhuma variação registrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ingrediente</th>
                  <th>Fornecedor</th>
                  <th>Anterior</th>
                  <th>Atual</th>
                  <th>Variação</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.map((h) => (
                  <tr key={h.id}>
                    <td>
                      {new Date(h.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td>{h.ingredientName}</td>
                    <td>{h.supplierName || '—'}</td>
                    <td>{formatMoney(h.previousCost)}</td>
                    <td>{formatMoney(h.newCost)}</td>
                    <td className={h.variationPercent > 0 ? 'text-cost' : 'text-profit'}>
                      {h.variationPercent == null
                        ? '—'
                        : `${h.variationPercent > 0 ? '+' : ''}${formatPercent(h.variationPercent)}`}
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
        title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
        onClose={() => !saving && setModalOpen(false)}
      >
        <form className="form-grid" onSubmit={handleSave}>
          <label className="form-field span-2">
            <span>Razão / Nome *</span>
            <input
              className="input"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
            {fieldErrors.name ? <em className="field-error">{fieldErrors.name}</em> : null}
          </label>
          <label className="form-field">
            <span>CNPJ (opcional)</span>
            <input
              className="input"
              value={values.document}
              onChange={(e) => setValues((v) => ({ ...v, document: e.target.value }))}
            />
            {fieldErrors.document ? <em className="field-error">{fieldErrors.document}</em> : null}
          </label>
          <label className="form-field">
            <span>Contato</span>
            <input
              className="input"
              value={values.contactName}
              onChange={(e) => setValues((v) => ({ ...v, contactName: e.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>Telefone</span>
            <input
              className="input"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>WhatsApp</span>
            <input
              className="input"
              value={values.whatsapp}
              onChange={(e) => setValues((v) => ({ ...v, whatsapp: e.target.value }))}
            />
          </label>
          <label className="form-field span-2">
            <span>E-mail</span>
            <input
              className="input"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            {fieldErrors.email ? <em className="field-error">{fieldErrors.email}</em> : null}
          </label>
          <label className="form-field span-2">
            <span>Observações</span>
            <textarea
              className="input input--area"
              rows={2}
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            />
          </label>
          <div className="form-field span-2">
            <span>Produtos fornecidos</span>
            <div className="chip-grid">
              {ingredients.map((ing) => (
                <label key={ing.id} className="chip-check">
                  <input
                    type="checkbox"
                    checked={values.ingredientIds.includes(ing.id)}
                    onChange={() => toggleIngredient(ing.id)}
                  />
                  {ing.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
