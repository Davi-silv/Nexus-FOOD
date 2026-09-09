import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { PLANS } from '@/config/plans.config.js';
import { formatMoney } from '@/core/utils/money.js';
import {
  createPlatformCompany,
  getPlatformCompany,
  getPlatformStats,
  listPlansCatalog,
  listPlatformCompanies,
  listPlatformSubscriptions,
  listPlatformUsers,
  listSupportLogs,
  logSupportAccess,
  setCompanyStatus,
  updatePlatformCompany,
} from '@/services/platform.service.js';
import { beginSupportTenantAccess, clearSupportTenantAccess, getSupportTenantAccess } from '@/services/company.service.js';
import { getCompanyProfile } from '@/services/settings.service.js';
import { useNavigate } from 'react-router-dom';

function statusTone(status) {
  if (status === 'active') return 'success';
  if (status === 'trial') return 'info';
  if (status === 'past_due' || status === 'suspended') return 'danger';
  return 'neutral';
}

export function AdminDashboardPage() {
  const stats = useMemo(() => getPlatformStats(), []);

  return (
    <AppShell title="Dashboard Admin" subtitle="Painel Evolutiva Tech — visão de plataforma">
      <section className="kpi-grid">
        <KpiCard label="Clientes ativos" value={stats.activeClients} tone="profit" />
        <KpiCard label="Trials" value={stats.trials} tone="info" />
        <KpiCard label="Inadimplentes" value={stats.pastDue} tone="danger" />
        <KpiCard label="MRR" value={stats.mrr} money tone="profit" />
        <KpiCard label="Usuários totais" value={stats.totalUsers} />
        <KpiCard label="Empresas cadastradas" value={stats.companiesTotal} />
      </section>

      <Card>
        <CardHeader
          title="Isolamento multiempresa"
          subtitle="Super Admin nunca mistura dados comerciais entre empresas"
        />
        <p className="prose">
          Métricas agregadas da plataforma. Acesso a dados de um restaurante específico passa pelo
          fluxo de suporte com motivo registrado.
        </p>
        <p className="prose muted mt-3">
          Planos START / PRO / FOOD+ com feature flags — cobrança real fica fora do MVP.
        </p>
      </Card>
    </AppShell>
  );
}

export function AdminCompaniesPage() {
  const toast = useToast();
  const [tick, setTick] = useState(0);
  const companies = useMemo(() => listPlatformCompanies(), [tick]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [planSlug, setPlanSlug] = useState('pro');
  const [segment, setSegment] = useState('hamburgueria');

  function handleCreate(e) {
    e.preventDefault();
    try {
      createPlatformCompany({
        name,
        tradeName,
        planSlug,
        segment,
        subscriptionStatus: 'trial',
        status: 'active',
      });
      toast.success('Empresa criada.');
      setOpen(false);
      setName('');
      setTradeName('');
      setTick((t) => t + 1);
    } catch (err) {
      toast.error(err.message || 'Falha ao criar.');
    }
  }

  function toggleStatus(company) {
    const next = company.status === 'active' ? 'suspended' : 'active';
    setCompanyStatus(company.id, next);
    toast.success(next === 'active' ? 'Empresa reativada.' : 'Empresa suspensa.');
    setTick((t) => t + 1);
  }

  function changePlan(company, slug) {
    updatePlatformCompany(company.id, { planSlug: slug });
    toast.success(`Plano atualizado para ${PLANS[slug]?.name || slug}.`);
    setTick((t) => t + 1);
  }

  return (
    <AppShell title="Empresas" subtitle="Criar, ativar e suspender clientes">
      <Card>
        <CardHeader
          title="Clientes"
          subtitle={`${companies.length} empresas`}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Nova empresa
            </Button>
          }
        />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Segmento</th>
                <th>Plano</th>
                <th>Assinatura</th>
                <th>Status</th>
                <th>MRR</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.tradeName}</strong>
                    <div className="muted">{c.document}</div>
                  </td>
                  <td>{c.segment}</td>
                  <td>
                    <select
                      value={c.planSlug}
                      onChange={(e) => changePlan(c, e.target.value)}
                      aria-label={`Plano ${c.tradeName}`}
                    >
                      {Object.values(PLANS).map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Badge tone={statusTone(c.subscriptionStatus)}>{c.subscriptionStatus}</Badge>
                  </td>
                  <td>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </td>
                  <td>{formatMoney(c.mrr || 0)}</td>
                  <td>
                    <Button variant="secondary" size="sm" onClick={() => toggleStatus(c)}>
                      {c.status === 'active' ? 'Suspender' : 'Reativar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova empresa">
        <form className="form-grid" onSubmit={handleCreate}>
          <label className="form-field">
            <span>Razão social</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Nome fantasia</span>
            <input className="input" value={tradeName} onChange={(e) => setTradeName(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Segmento</span>
            <select className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="hamburgueria">Hamburgueria</option>
              <option value="pizzaria">Pizzaria</option>
              <option value="lanchonete">Lanchonete</option>
              <option value="restaurante">Restaurante</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
          <label className="form-field">
            <span>Plano</span>
            <select className="input" value={planSlug} onChange={(e) => setPlanSlug(e.target.value)}>
              {Object.values(PLANS).map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} — {formatMoney(p.priceMonthly)}/mês
                </option>
              ))}
            </select>
          </label>
          <div className="span-2 form-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

export function AdminSubscriptionsPage() {
  const subs = useMemo(() => listPlatformSubscriptions(), []);

  return (
    <AppShell title="Assinaturas" subtitle="Trials, ativos e inadimplentes">
      <Card>
        <CardHeader title="Assinaturas" subtitle="Sem cobrança real no MVP" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Trial até</th>
                <th>MRR</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.companyName}</td>
                  <td>{s.planName}</td>
                  <td>
                    <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td>{s.trialEndsAt || '—'}</td>
                  <td>{formatMoney(s.mrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

export function AdminUsersPage() {
  const users = useMemo(() => listPlatformUsers(), []);

  return (
    <AppShell title="Usuários" subtitle="Visão cross-tenant (somente Super Admin)">
      <Card>
        <CardHeader title="Usuários da plataforma" subtitle={`${users.length} contas`} />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Empresa</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <Badge>{u.role}</Badge>
                  </td>
                  <td>{u.companyName || '—'}</td>
                  <td>
                    <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

export function AdminPlansPage() {
  const plans = listPlansCatalog();

  return (
    <AppShell title="Planos" subtitle="START · PRO · FOOD+">
      <section className="plans-grid">
        {plans.map((p) => (
          <Card key={p.slug} className={p.recommended ? 'plan-card is-recommended' : 'plan-card'}>
            <CardHeader
              title={p.name}
              subtitle={p.description}
              action={p.recommended ? <Badge tone="info">Recomendado</Badge> : null}
            />
            <p className="plan-price">{formatMoney(p.priceMonthly)}<span>/mês</span></p>
            <ul className="plan-features">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

export function AdminSupportPage() {
  const { user, setActiveCompany, company } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const companies = useMemo(() => listPlatformCompanies(), [tick]);
  const logs = useMemo(() => listSupportLogs(), [tick]);
  const support = useMemo(() => getSupportTenantAccess(), [tick, company?.id]);
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [reason, setReason] = useState('');

  function handleLog(e) {
    e.preventDefault();
    try {
      const platformCompany = companies.find((c) => c.id === companyId);
      beginSupportTenantAccess({
        companyId,
        reason,
        adminUserId: user?.id,
        adminName: user?.name,
      });
      logSupportAccess({
        adminUserId: user?.id,
        adminName: user?.name,
        companyId,
        companyName: platformCompany?.tradeName,
        reason,
      });
      const profile = getCompanyProfile(companyId) || getPlatformCompany(companyId);
      setActiveCompany(profile);
      toast.success('Modo suporte ativo. Dados do cliente liberados com auditoria.');
      setReason('');
      setTick((t) => t + 1);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Não foi possível registrar.');
    }
  }

  function handleEndSupport() {
    clearSupportTenantAccess();
    setActiveCompany(null);
    setTick((t) => t + 1);
    toast.info('Modo suporte encerrado.');
    navigate('/admin/suporte');
  }

  return (
    <AppShell title="Suporte" subtitle="Acesso técnico controlado com auditoria">
      {support?.companyId ? (
        <Card className="mb-3">
          <CardHeader
            title="Modo suporte ativo"
            subtitle={`${support.companyId} — ${support.reason}`}
            action={
              <Button type="button" variant="secondary" onClick={handleEndSupport}>
                Encerrar suporte
              </Button>
            }
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Registrar acesso" subtitle="Obrigatório antes de abrir dados de um cliente" />
        <form className="form-grid" onSubmit={handleLog}>
          <label className="form-field">
            <span>Empresa</span>
            <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field span-2">
            <span>Motivo</span>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: cliente reportou CMV incorreto"
              required
            />
          </label>
          <div className="span-2">
            <Button type="submit">Ativar modo suporte</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-3">
        <CardHeader title="Log de auditoria" subtitle="Últimos acessos técnicos" />
        {logs.length === 0 ? (
          <EmptyState title="Nenhum acesso registrado" description="Registre um motivo acima." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Admin</th>
                  <th>Empresa</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
                    <td>{l.adminName}</td>
                    <td>{l.companyName}</td>
                    <td>{l.reason}</td>
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
