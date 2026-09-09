import {
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_MODULES,
  ROLES,
} from '@/config/roles.config.js';
import { DEMO_COMPANY, DEMO_USERS } from '@/data/demo.js';
import { requireCompanyAccess } from '@/services/company.service.js';
import { uid } from '@/core/utils/helpers.js';

function key(companyId) {
  return `nexus-food:users:${companyId}`;
}

function read(companyId) {
  try {
    const raw = localStorage.getItem(key(companyId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(companyId, rows) {
  localStorage.setItem(key(companyId), JSON.stringify(rows));
}

function seedUsers(companyId) {
  const now = new Date().toISOString();
  const fromDemo = Object.values(DEMO_USERS)
    .filter((u) => u.companyId === companyId && u.role !== ROLES.PLATFORM_SUPER_ADMIN)
    .map((u) => ({
      id: u.id,
      companyId,
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      permissions:
        u.role === ROLES.COMPANY_ADMIN
          ? null
          : { ...DEFAULT_EMPLOYEE_PERMISSIONS, ...(u.permissions || {}) },
      active: true,
      seeded: true,
      createdAt: now,
      updatedAt: now,
    }));

  if (fromDemo.length) return fromDemo;

  // empresa sem seed demo: admin placeholder
  return [
    {
      id: uid('usr'),
      companyId,
      name: 'Admin',
      email: `admin@${companyId}.local`,
      password: 'admin',
      role: ROLES.COMPANY_ADMIN,
      permissions: null,
      active: true,
      seeded: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function ensure(companyId) {
  if (!companyId) return [];
  let rows = read(companyId);
  if (!rows) {
    rows = seedUsers(companyId);
    write(companyId, rows);
  }
  return rows.filter((r) => r.companyId === companyId);
}

function normalizePermissions(role, permissions) {
  if (role === ROLES.COMPANY_ADMIN) return null;
  const base = { ...DEFAULT_EMPLOYEE_PERMISSIONS };
  for (const mod of PERMISSION_MODULES) {
    if (permissions && typeof permissions[mod] === 'boolean') {
      base[mod] = permissions[mod];
    }
  }
  // segurança: finance/reports nunca ligados por padrão silencioso
  base.users = Boolean(permissions?.users);
  base.settings = Boolean(permissions?.settings);
  return base;
}

export const PERMISSION_LABELS = {
  dashboard: 'Dashboard',
  products: 'Produtos',
  ingredients: 'Ingredientes',
  recipes: 'Ficha técnica',
  inventory: 'Estoque',
  purchases: 'Compras',
  suppliers: 'Fornecedores',
  waste: 'Desperdícios',
  sales: 'Vendas',
  finance: 'Financeiro',
  reports: 'Relatórios',
  users: 'Usuários',
  settings: 'Configurações',
};

export function listCompanyUsers(companyId) {
  if (!companyId) return [];
  requireCompanyAccess(companyId);
  return ensure(companyId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function getCompanyUser(companyId, id) {
  return ensure(companyId).find((u) => u.id === id) || null;
}

/** Busca usuário autenticável (cadastros locais têm prioridade sobre seed) */
export function findAuthUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k?.startsWith('nexus-food:users:')) continue;
    try {
      const rows = JSON.parse(localStorage.getItem(k) || '[]');
      const match = (rows || []).find(
        (u) => u.email === normalized && u.active !== false,
      );
      if (match) return { ...match };
    } catch {
      /* ignore */
    }
  }

  const demo = Object.values(DEMO_USERS).find((u) => u.email === normalized);
  return demo ? { ...demo } : null;
}

export function findAuthUserById(id) {
  if (!id) return null;

  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k?.startsWith('nexus-food:users:')) continue;
    try {
      const rows = JSON.parse(localStorage.getItem(k) || '[]');
      const match = (rows || []).find((u) => u.id === id);
      if (match) return { ...match };
    } catch {
      /* ignore */
    }
  }

  const demo = Object.values(DEMO_USERS).find((u) => u.id === id);
  return demo ? { ...demo } : null;
}

export function createCompanyUser(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  if (!companyId) throw new Error('Empresa não definida.');
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '').trim();
  const role = payload.role === ROLES.COMPANY_ADMIN ? ROLES.COMPANY_ADMIN : ROLES.EMPLOYEE;

  const errors = {};
  if (name.length < 2) errors.name = 'Informe o nome.';
  if (!email.includes('@')) errors.email = 'E-mail inválido.';
  if (password.length < 4) errors.password = 'Senha com ao menos 4 caracteres.';
  if (Object.keys(errors).length) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = errors;
    throw err;
  }

  if (findAuthUserByEmail(email)) {
    const err = new Error('Já existe um usuário com este e-mail.');
    err.fieldErrors = { email: err.message };
    throw err;
  }

  const now = new Date().toISOString();
  const row = {
    id: uid('usr'),
    companyId,
    name,
    email,
    password,
    role,
    permissions: normalizePermissions(role, payload.permissions),
    active: true,
    seeded: false,
    createdAt: now,
    updatedAt: now,
  };

  write(companyId, [...ensure(companyId), row]);
  return publicUser(row);
}

export function updateCompanyUser(companyId, id, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  const rows = ensure(companyId);
  const idx = rows.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error('Usuário não encontrado.');

  const current = rows[idx];
  if (current.companyId !== companyId) throw new Error('Acesso negado: dados de outra empresa.');

  const role =
    payload.role === ROLES.COMPANY_ADMIN
      ? ROLES.COMPANY_ADMIN
      : payload.role === ROLES.EMPLOYEE
        ? ROLES.EMPLOYEE
        : current.role;

  if (role === ROLES.PLATFORM_SUPER_ADMIN) {
    throw new Error('Não é permitido atribuir papel de Super Admin.');
  }

  // não remover o último admin ativo
  if (
    current.role === ROLES.COMPANY_ADMIN &&
    (role !== ROLES.COMPANY_ADMIN || payload.active === false)
  ) {
    const otherAdmins = rows.filter(
      (u) => u.id !== id && u.role === ROLES.COMPANY_ADMIN && u.active !== false,
    );
    if (otherAdmins.length === 0) {
      throw new Error('É necessário manter ao menos um administrador ativo.');
    }
  }

  const nextPassword =
    payload.password && String(payload.password).trim()
      ? String(payload.password).trim()
      : current.password;

  const next = {
    ...current,
    name: payload.name != null ? String(payload.name).trim() : current.name,
    email: payload.email != null ? String(payload.email).trim().toLowerCase() : current.email,
    password: nextPassword,
    role,
    permissions: normalizePermissions(role, payload.permissions ?? current.permissions),
    active: payload.active === false ? false : payload.active === true ? true : current.active,
    updatedAt: new Date().toISOString(),
  };

  if (next.email !== current.email && findAuthUserByEmail(next.email)) {
    const err = new Error('Já existe um usuário com este e-mail.');
    err.fieldErrors = { email: err.message };
    throw err;
  }

  rows[idx] = next;
  write(companyId, rows);
  return publicUser(next);
}

export function deactivateCompanyUser(companyId, id) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  return updateCompanyUser(companyId, id, { active: false });
}

export function publicUser(user) {
  if (!user) return null;
  const { password: _pw, ...safe } = user;
  return safe;
}

export function resetCompanyUsers(companyId) {
  if (!companyId) return;
  localStorage.removeItem(key(companyId));
}

/** Garante seed da empresa demo ao boot */
export function ensureDemoCompanyUsers() {
  ensure(DEMO_COMPANY.id);
}

/**
 * Cria o primeiro admin de uma empresa nova (sem seed automático).
 * Usado no cadastro público.
 */
export function bootstrapCompanyOwner(companyId, { name, email, password }) {
  if (!companyId) throw new Error('Empresa não definida.');
  if (read(companyId)) {
    throw new Error('Esta empresa já possui usuários.');
  }

  const ownerName = String(name || '').trim();
  const ownerEmail = String(email || '').trim().toLowerCase();
  const ownerPassword = String(password || '').trim();

  const errors = {};
  if (ownerName.length < 2) errors.name = 'Informe o seu nome.';
  if (!ownerEmail.includes('@')) errors.email = 'E-mail inválido.';
  if (ownerPassword.length < 4) errors.password = 'Senha com ao menos 4 caracteres.';
  if (Object.keys(errors).length) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = errors;
    throw err;
  }

  if (findAuthUserByEmail(ownerEmail)) {
    const err = new Error('Já existe um usuário com este e-mail.');
    err.fieldErrors = { email: err.message };
    throw err;
  }

  const now = new Date().toISOString();
  const row = {
    id: uid('usr'),
    companyId,
    name: ownerName,
    email: ownerEmail,
    password: ownerPassword,
    role: ROLES.COMPANY_ADMIN,
    permissions: null,
    active: true,
    seeded: false,
    createdAt: now,
    updatedAt: now,
  };
  write(companyId, [row]);
  return publicUser(row);
}
