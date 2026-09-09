import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { PAYMENT_METHODS } from '@/core/constants.js';
import { listIngredients } from '@/services/ingredients.service.js';
import { listSuppliers } from '@/services/suppliers.service.js';
import {
  confirmPurchase,
  createPurchase,
  listPurchases,
} from '@/services/purchases.service.js';
import { formatMoney, formatNumber } from '@/core/utils/money.js';

function emptyItem() {
  return { ingredientId: '', quantity: '1', unitPrice: '0' };
}

export function PurchasesPage() {
  const { company } = useAuth();
  const toast = useToast();
  const companyId = company?.id;

  const [tick, setTick] = useState(0);
  const purchases = useMemo(() => (companyId ? listPurchases(companyId) : []), [companyId, tick]);
  const suppliers = useMemo(
    () => (companyId ? listSuppliers(companyId).filter((s) => s.status === 'active') : []),
    [companyId, tick],
  );
  const ingredients = useMemo(
    () => (companyId ? listIngredients(companyId).filter((i) => i.status === 'active') : []),
    [companyId, tick],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [status, setStatus] = useState('confirmed');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);

  const monthTotal = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return purchases
      .filter((p) => String(p.purchaseDate).startsWith(month) && p.status !== 'cancelled')
      .reduce((s, p) => s + (Number(p.total) || 0), 0);
  }, [purchases]);

  const pendingCount = purchases.filter((p) => p.status === 'pending').length;

  function openCreate() {
    setSupplierId(suppliers[0]?.id || '');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('pix');
    setStatus('confirmed');
    setNotes('');
    setItems([emptyItem()]);
    setFieldErrors({});
    setModalOpen(true);
  }

  function updateItem(index, patch) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function onIngredientPick(index, ingredientId) {
    const ing = ingredients.find((i) => i.id === ingredientId);
    updateItem(index, {
      ingredientId,
      unitPrice: String(ing?.currentCost ?? 0),
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      createPurchase(companyId, {
        supplierId: supplierId || null,
        purchaseDate,
        paymentMethod,
        status,
        notes,
        items: items.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      toast.success(
        status === 'pending'
          ? 'Compra registrada como pendente.'
          : 'Compra confirmada — estoque e custos atualizados.',
      );
      setModalOpen(false);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível registrar a compra.');
    } finally {
      setSaving(false);
    }
  }

  function handleConfirm(p) {
    try {
      confirmPurchase(companyId, p.id);
      toast.success('Compra confirmada — estoque atualizado.');
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const statusTone = {
    pending: 'warning',
    confirmed: 'info',
    paid: 'success',
    parcelado: 'info',
    cancelled: 'neutral',
  };

  return (
    <AppShell title="Compras" subtitle="Atualiza estoque, custo e fichas técnicas">
      <section className="kpi-grid">
        <KpiCard label="Compras no mês" value={monthTotal} money tone="cost" />
        <KpiCard label="Pendentes" value={pendingCount} tone="warning" />
        <KpiCard label="Registros" value={purchases.length} tone="stock" />
      </section>

      <Card>
        <CardHeader
          title="Pedidos de compra"
          subtitle={`${purchases.length} · ${company?.tradeName || ''}`}
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nova compra
            </Button>
          }
        />

        {purchases.length === 0 ? (
          <EmptyState
            title="Nenhuma compra"
            description="Registre uma compra para entrar estoque e atualizar custos."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Registrar compra
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fornecedor</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {new Date(`${p.purchaseDate}T12:00:00`).toLocaleDateString('pt-BR')}
                    </td>
                    <td>{p.supplierName || '—'}</td>
                    <td>{p.items?.length || 0}</td>
                    <td>{formatMoney(p.total)}</td>
                    <td>
                      {PAYMENT_METHODS.find((m) => m.value === p.paymentMethod)?.label ||
                        p.paymentMethod}
                    </td>
                    <td>
                      <Badge tone={statusTone[p.status] || 'neutral'}>{p.status}</Badge>
                    </td>
                    <td>
                      {p.status === 'pending' && !p.appliedAt ? (
                        <Button size="sm" variant="secondary" onClick={() => handleConfirm(p)}>
                          Confirmar
                        </Button>
                      ) : p.appliedAt ? (
                        <span className="muted">Aplicada</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} title="Nova compra" onClose={() => !saving && setModalOpen(false)}>
        <form className="recipe-form" onSubmit={handleSave}>
          <div className="form-grid">
            <label className="form-field">
              <span>Fornecedor</span>
              <select
                className="input"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Data *</span>
              <input
                className="input"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
              {fieldErrors.purchaseDate ? (
                <em className="field-error">{fieldErrors.purchaseDate}</em>
              ) : null}
            </label>
            <label className="form-field">
              <span>Pagamento</span>
              <select
                className="input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Status</span>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="confirmed">Confirmado (aplica estoque)</option>
                <option value="paid">Pago</option>
                <option value="parcelado">Parcelado</option>
                <option value="pending">Pendente</option>
              </select>
            </label>
          </div>

          <div className="recipe-items">
            <div className="recipe-items__head">
              <h4>Itens</h4>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
              >
                <Plus size={14} />
                Item
              </Button>
            </div>
            {fieldErrors.items ? <em className="field-error">{fieldErrors.items}</em> : null}
            {items.map((item, index) => (
              <div key={index} className="recipe-item-row">
                <label className="form-field">
                  <span>Ingrediente</span>
                  <select
                    className="input"
                    value={item.ingredientId}
                    onChange={(e) => onIngredientPick(index, e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Qtd</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Preço unit.</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="recipe-item-row__remove"
                  disabled={items.length <= 1}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}
          </div>

          <p className="muted">
            Total:{' '}
            <strong>
              {formatMoney(
                items.reduce(
                  (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
                  0,
                ),
              )}
            </strong>
            {' · '}
            {formatNumber(items.length)} item(ns)
          </p>

          <label className="form-field">
            <span>Observações</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar compra
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
