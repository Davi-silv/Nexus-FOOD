import { PLANS } from '@/config/plans.config.js';
import { DEMO_COMPANY, DEMO_USERS } from '@/data/demo.js';
import { assertPlatformAdminSession, getSessionActor } from '@/services/company.service.js';
import { uid } from '@/core/utils/helpers.js';

function guardPlatformWhenAuthenticated() {
  const user = getSessionActor();
  if (user) assertPlatformAdminSession();
}

const STORAGE_KEY = 'nexus-food:platform:companies';
const USERS_KEY = 'nexus-food:platform:users';
const SUPPORT_KEY = 'nexus-food:platform:support_logs';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedCompanies() {
  const now = new Date().toISOString();
  return [
    {
      ...DEMO_COMPANY,
      usersCount: 2,
      subscriptionStatus: 'active',
      trialEndsAt: null,
      mrr: PLANS.pro.priceMonthly,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'company_pizzaria_demo',
      name: 'Pizzaria Forno Quente Ltda',
      tradeName: 'Forno Quente',
      document: '98.765.432/0001-10',
      segment: 'pizzaria',
      planSlug: 'start',
      status: 'active',
      idealCmv: 28,
      usersCount: 1,
      subscriptionStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      mrr: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'company_lanche_demo',
      name: 'Lanche Express ME',
      tradeName: 'Lanche Express',
      document: '11.222.333/0001-44',
      segment: 'lanchonete',
      planSlug: 'food_plus',
      status: 'suspended',
      idealCmv: 30,
      usersCount: 3,
      subscriptionStatus: 'past_due',
      trialEndsAt: null,
      mrr: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function ensureCompanies() {
  let rows = read(STORAGE_KEY, null);
  if (!rows) {
    rows = seedCompanies();
    write(STORAGE_KEY, rows);
  }
  return rows;
}

function ensurePlatformUsers() {
  let rows = read(USERS_KEY, null);
  if (!rows) {
    rows = [
      {
        id: DEMO_USERS.admin.id,
        name: DEMO_USERS.admin.name,
        email: DEMO_USERS.admin.email,
        role: DEMO_USERS.admin.role,
        companyId: DEMO_COMPANY.id,
        companyName: DEMO_COMPANY.tradeName,
        status: 'active',
      },
      {
        id: DEMO_USERS.employee.id,
        name: DEMO_USERS.employee.name,
        email: DEMO_USERS.employee.email,
        role: DEMO_USERS.employee.role,
        companyId: DEMO_COMPANY.id,
        companyName: DEMO_COMPANY.tradeName,
        status: 'active',
      },
      {
        id: DEMO_USERS.superAdmin.id,
        name: DEMO_USERS.superAdmin.name,
        email: DEMO_USERS.superAdmin.email,
        role: DEMO_USERS.superAdmin.role,
        companyId: null,
        companyName: 'Plataforma',
        status: 'active',
      },
      {
        id: 'user_pizzaria_admin',
        name: 'Bruno Pizza',
        email: 'bruno@fornoquente.local',
        role: 'company_admin',
        companyId: 'company_pizzaria_demo',
        companyName: 'Forno Quente',
        status: 'active',
      },
    ];
    write(USERS_KEY, rows);
  }
  return rows;
}

export function listPlatformCompanies() {
  guardPlatformWhenAuthenticated();
  return ensureCompanies().slice().sort((a, b) => a.tradeName.localeCompare(b.tradeName));
}

export function getPlatformCompany(id) {
  guardPlatformWhenAuthenticated();
  return ensureCompanies().find((c) => c.id === id) || null;
}

export function createPlatformCompany(payload) {
  guardPlatformWhenAuthenticated();
  const rows = ensureCompanies();
  const now = new Date().toISOString();
  const plan = PLANS[payload.planSlug] || PLANS.start;
  const row = {
    id: payload.id || uid('company'),
    name: payload.name?.trim() || 'Nova empresa',
    tradeName: payload.tradeName?.trim() || payload.name?.trim() || 'Nova empresa',
    document: payload.document?.trim() || '',
    segment: payload.segment || 'restaurante',
    planSlug: plan.slug,
    status: payload.status || 'active',
    idealCmv: Number(payload.idealCmv) || 32,
    usersCount: payload.usersCount ?? 1,
    subscriptionStatus: payload.subscriptionStatus || 'trial',
    trialEndsAt:
      (payload.subscriptionStatus || 'trial') === 'trial'
        ? payload.trialEndsAt ||
          new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
        : null,
    mrr: payload.subscriptionStatus === 'active' ? plan.priceMonthly : 0,
    createdAt: now,
    updatedAt: now,
  };
  write(STORAGE_KEY, [...rows, row]);
  return row;
}

export function registerPlatformUser(payload) {
  guardPlatformWhenAuthenticated();
  const rows = ensurePlatformUsers();
  const row = {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    companyId: payload.companyId,
    companyName: payload.companyName,
    status: payload.status || 'active',
  };
  write(USERS_KEY, [...rows, row]);
  return row;
}

export function updatePlatformCompany(id, patch) {
  guardPlatformWhenAuthenticated();
  const rows = ensureCompanies();
  const idx = rows.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Empresa não encontrada.');
  const plan = PLANS[patch.planSlug || rows[idx].planSlug] || PLANS.start;
  const next = {
    ...rows[idx],
    ...patch,
    planSlug: plan.slug,
    mrr:
      (patch.subscriptionStatus || rows[idx].subscriptionStatus) === 'active'
        ? plan.priceMonthly
        : 0,
    updatedAt: new Date().toISOString(),
  };
  rows[idx] = next;
  write(STORAGE_KEY, rows);
  return next;
}

export function setCompanyStatus(id, status) {
  return updatePlatformCompany(id, { status });
}

export function listPlatformSubscriptions() {
  return listPlatformCompanies().map((c) => ({
    id: `sub_${c.id}`,
    companyId: c.id,
    companyName: c.tradeName,
    planSlug: c.planSlug,
    planName: PLANS[c.planSlug]?.name || c.planSlug,
    status: c.subscriptionStatus,
    mrr: c.mrr || 0,
    trialEndsAt: c.trialEndsAt,
    companyStatus: c.status,
  }));
}

export function listPlatformUsers() {
  guardPlatformWhenAuthenticated();
  return ensurePlatformUsers();
}

export function listPlansCatalog() {
  return Object.values(PLANS);
}

export function getPlatformStats() {
  guardPlatformWhenAuthenticated();
  const companies = listPlatformCompanies();
  const users = listPlatformUsers();
  const active = companies.filter((c) => c.status === 'active' && c.subscriptionStatus === 'active');
  const trials = companies.filter((c) => c.subscriptionStatus === 'trial');
  const pastDue = companies.filter((c) => c.subscriptionStatus === 'past_due');
  const mrr = active.reduce((s, c) => s + (c.mrr || 0), 0);

  return {
    activeClients: active.length,
    trials: trials.length,
    pastDue: pastDue.length,
    mrr,
    totalUsers: users.length,
    companiesTotal: companies.length,
  };
}

export function listSupportLogs() {
  guardPlatformWhenAuthenticated();
  return read(SUPPORT_KEY, []);
}

/** Registro auditado de acesso técnico a uma empresa */
export function logSupportAccess({ adminUserId, adminName, companyId, companyName, reason }) {
  guardPlatformWhenAuthenticated();
  if (!companyId || !reason?.trim()) {
    throw new Error('Informe a empresa e o motivo do acesso.');
  }
  const logs = listSupportLogs();
  const entry = {
    id: uid('sup'),
    adminUserId,
    adminName,
    companyId,
    companyName,
    reason: reason.trim(),
    createdAt: new Date().toISOString(),
  };
  write(SUPPORT_KEY, [entry, ...logs].slice(0, 100));
  return entry;
}

export function resetPlatformDemo() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(SUPPORT_KEY);
}
