import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { PAYMENT_METHODS } from '@/core/constants.js';
import {
  createPayable,
  createReceivable,
  createTransaction,
  getFinanceSummary,
  listFinanceCategories,
  listPayables,
  listReceivables,
  listTransactions,
  markPayablePaid,
  markReceivableReceived,
} from '@/services/finance.service.js';
import { formatMoney } from '@/core/utils/money.js';

export function FinancePage() {
  const { company } = useAuth();
  const toast = useToast();
  const companyId = company?.id;
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState('lancamentos');

  const summary = useMemo(
    () => (companyId ? getFinanceSummary(companyId) : null),
    [companyId, tick],
  );
  const transactions = useMemo(
    () => (companyId ? listTransactions(companyId) : []),
    [companyId, tick],
  );
  const payables = useMemo(() => (companyId ? listPayables(companyId) : []), [companyId, tick]);
  const receivables = useMemo(
    () => (companyId ? listReceivables(companyId) : []),
    [companyId, tick],
  );
  const categories = useMemo(
    () => (companyId ? listFinanceCategories(companyId) : []),
    [companyId, tick],
  );

  const [modal, setModal] = useState(null); // tx | ap | ar
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // tx form
  const [txType, setTxType] = useState('income');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txPay, setTxPay] = useState('pix');
  const [txCat, setTxCat] = useState('');

  // payable form
  const [apDesc, setApDesc] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDue, setApDue] = useState('');
  const [apSupplier, setApSupplier] = useState('');

  // receivable form
  const [arDesc, setArDesc] = useState('');
  const [arAmount, setArAmount] = useState('');
  const [arDue, setArDue] = useState('');
  const [arCustomer, setArCustomer] = useState('');

  function openTx(type = 'income') {
    setTxType(type);
    setTxDesc('');
    setTxAmount('');
    setTxDate(new Date().toISOString().slice(0, 10));
    setTxPay('pix');
    const cats = categories.filter((c) => c.type === type);
    setTxCat(cats[0]?.id || '');
    setFieldErrors({});
    setModal('tx');
  }

  function openAp() {
    setApDesc('');
    setApAmount('');
    setApDue(new Date().toISOString().slice(0, 10));
    setApSupplier('');
    setFieldErrors({});
    setModal('ap');
  }

  function openAr() {
    setArDesc('');
    setArAmount('');
    setArDue(new Date().toISOString().slice(0, 10));
    setArCustomer('');
    setFieldErrors({});
    setModal('ar');
  }

  async function saveTx(e) {
    e.preventDefault();
    setSaving(true);
    try {
      createTransaction(companyId, {
        type: txType,
        description: txDesc,
        amount: Number(txAmount),
        date: txDate,
        paymentMethod: txPay,
        categoryId: txCat || null,
      });
      toast.success(txType === 'income' ? 'Receita registrada.' : 'Despesa registrada.');
      setModal(null);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAp(e) {
    e.preventDefault();
    setSaving(true);
    try {
      createPayable(companyId, {
        description: apDesc,
        amount: Number(apAmount),
        dueDate: apDue,
        supplierName: apSupplier || null,
        status: 'pending',
        categoryId: 'cat_compras',
      });
      toast.success('Conta a pagar cadastrada.');
      setModal(null);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAr(e) {
    e.preventDefault();
    setSaving(true);
    try {
      createReceivable(companyId, {
        description: arDesc,
        amount: Number(arAmount),
        dueDate: arDue,
        customerName: arCustomer || null,
        status: 'pending',
        categoryId: 'cat_vendas',
      });
      toast.success('Conta a receber cadastrada.');
      setModal(null);
      setTick((t) => t + 1);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function payAp(id) {
    try {
      markPayablePaid(companyId, id);
      toast.success('Conta paga e despesa lançada.');
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function receiveAr(id) {
    try {
      markReceivableReceived(companyId, id);
      toast.success('Recebimento registrado.');
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message);
    }
  }

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const payLabel = (v) => PAYMENT_METHODS.find((p) => p.value === v)?.label || v;

  return (
    <AppShell title="Financeiro" subtitle="Receitas, despesas e fluxo de caixa">
      <section className="kpi-grid">
        <KpiCard label="Receita (mês)" value={summary?.incomeMonth || 0} money tone="profit" />
        <KpiCard label="Despesa (mês)" value={summary?.expenseMonth || 0} money tone="cost" />
        <KpiCard label="Saldo / lucro" value={summary?.balanceMonth || 0} money tone="profit" />
        <KpiCard label="A pagar" value={summary?.payablesPending || 0} money tone="waste" />
        <KpiCard label="A receber" value={summary?.receivablesPending || 0} money tone="stock" />
      </section>

      <div className="segmented mb-3">
        {[
          { key: 'lancamentos', label: 'Lançamentos' },
          { key: 'pagar', label: 'Contas a pagar' },
          { key: 'receber', label: 'Contas a receber' },
          { key: 'categorias', label: 'Categorias' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'is-active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lancamentos' ? (
        <Card>
          <CardHeader
            title="Receitas e despesas"
            subtitle="Fluxo de caixa operacional"
            action={
              <div className="toolbar">
                <Button variant="secondary" onClick={() => openTx('expense')}>
                  Despesa
                </Button>
                <Button onClick={() => openTx('income')}>
                  <Plus size={16} />
                  Receita
                </Button>
              </div>
            }
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(`${t.date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <Badge tone={t.type === 'income' ? 'success' : 'warning'}>
                        {t.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </td>
                    <td>{t.description}</td>
                    <td>{catName(t.categoryId)}</td>
                    <td>{payLabel(t.paymentMethod)}</td>
                    <td className={t.type === 'income' ? 'text-profit' : 'text-cost'}>
                      {t.type === 'income' ? '+' : '−'}
                      {formatMoney(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'pagar' ? (
        <Card>
          <CardHeader
            title="Contas a pagar"
            action={
              <Button onClick={openAp}>
                <Plus size={16} />
                Nova
              </Button>
            }
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Fornecedor</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {payables.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(`${p.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{p.description}</td>
                    <td>{p.supplierName || '—'}</td>
                    <td>{formatMoney(p.amount)}</td>
                    <td>
                      <Badge tone={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                    </td>
                    <td>
                      {p.status === 'pending' ? (
                        <Button size="sm" variant="secondary" onClick={() => payAp(p.id)}>
                          Pagar
                        </Button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'receber' ? (
        <Card>
          <CardHeader
            title="Contas a receber"
            action={
              <Button onClick={openAr}>
                <Plus size={16} />
                Nova
              </Button>
            }
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(`${r.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{r.description}</td>
                    <td>{r.customerName || '—'}</td>
                    <td>{formatMoney(r.amount)}</td>
                    <td>
                      <Badge tone={r.status === 'received' ? 'success' : 'info'}>{r.status}</Badge>
                    </td>
                    <td>
                      {r.status === 'pending' ? (
                        <Button size="sm" variant="secondary" onClick={() => receiveAr(r.id)}>
                          Receber
                        </Button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'categorias' ? (
        <Card>
          <CardHeader title="Categorias financeiras" subtitle="Adaptadas para alimentação" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <Badge tone={c.type === 'income' ? 'success' : 'warning'}>
                        {c.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Modal
        open={modal === 'tx'}
        title={txType === 'income' ? 'Nova receita' : 'Nova despesa'}
        onClose={() => !saving && setModal(null)}
      >
        <form className="form-grid" onSubmit={saveTx}>
          <label className="form-field span-2">
            <span>Descrição *</span>
            <input className="input" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
            {fieldErrors.description ? (
              <em className="field-error">{fieldErrors.description}</em>
            ) : null}
          </label>
          <label className="form-field">
            <span>Valor *</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Data *</span>
            <input
              className="input"
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Pagamento</span>
            <select className="input" value={txPay} onChange={(e) => setTxPay(e.target.value)}>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Categoria</span>
            <select className="input" value={txCat} onChange={(e) => setTxCat(e.target.value)}>
              {categories
                .filter((c) => c.type === txType)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'ap'} title="Nova conta a pagar" onClose={() => !saving && setModal(null)}>
        <form className="form-grid" onSubmit={saveAp}>
          <label className="form-field span-2">
            <span>Descrição *</span>
            <input className="input" value={apDesc} onChange={(e) => setApDesc(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Valor *</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={apAmount}
              onChange={(e) => setApAmount(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Vencimento *</span>
            <input
              className="input"
              type="date"
              value={apDue}
              onChange={(e) => setApDue(e.target.value)}
            />
          </label>
          <label className="form-field span-2">
            <span>Fornecedor</span>
            <input
              className="input"
              value={apSupplier}
              onChange={(e) => setApSupplier(e.target.value)}
            />
          </label>
          <div className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === 'ar'}
        title="Nova conta a receber"
        onClose={() => !saving && setModal(null)}
      >
        <form className="form-grid" onSubmit={saveAr}>
          <label className="form-field span-2">
            <span>Descrição *</span>
            <input className="input" value={arDesc} onChange={(e) => setArDesc(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Valor *</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={arAmount}
              onChange={(e) => setArAmount(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Vencimento *</span>
            <input
              className="input"
              type="date"
              value={arDue}
              onChange={(e) => setArDue(e.target.value)}
            />
          </label>
          <label className="form-field span-2">
            <span>Cliente</span>
            <input
              className="input"
              value={arCustomer}
              onChange={(e) => setArCustomer(e.target.value)}
            />
          </label>
          <div className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>
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
