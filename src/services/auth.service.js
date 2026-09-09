import { getSupabaseClient } from '@/lib/supabase.js';
import { isSupabaseEnabled } from '@/config/supabase.config.js';
import { STORAGE_KEYS } from '@/core/constants.js';
import { ROLES } from '@/config/roles.config.js';
import {
  bootstrapCompanyOwner,
  findAuthUserByEmail,
  findAuthUserById,
  publicUser,
  ensureDemoCompanyUsers,
} from '@/services/users.service.js';
import { getCompanyProfile, updateCompanyProfile, SEGMENT_OPTIONS } from '@/services/settings.service.js';
import { createPlatformCompany, registerPlatformUser } from '@/services/platform.service.js';
import { PLANS } from '@/config/plans.config.js';
import { uid } from '@/core/utils/helpers.js';

function toPublicUser(user) {
  return publicUser(user) || null;
}

function saveSession(user, company) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
  if (company) {
    localStorage.setItem(STORAGE_KEYS.company, JSON.stringify(company));
  } else {
    localStorage.removeItem(STORAGE_KEYS.company);
  }
}

function resolveCompanyForUser(user, storedCompany) {
  if (!user?.companyId) return null;
  const profile = getCompanyProfile(user.companyId);
  if (storedCompany?.id === user.companyId) {
    return { ...profile, ...storedCompany, ...profile, id: user.companyId };
  }
  return profile;
}

/**
 * Reidrata sessão demo a partir da fonte canônica.
 * Impede privilege escalation via edição do localStorage (role/permissions).
 */
export function sanitizeDemoSession(storedUser, storedCompany) {
  if (!storedUser?.email && !storedUser?.id) {
    return { user: null, company: null };
  }

  ensureDemoCompanyUsers();

  const canonical =
    findAuthUserById(storedUser.id) || findAuthUserByEmail(storedUser.email);

  if (!canonical) {
    clearSession();
    return { user: null, company: null };
  }

  return finalizeSession(canonical, storedCompany);
}

function finalizeSession(canonical, storedCompany) {
  const user = toPublicUser(canonical);

  if (user.role === ROLES.PLATFORM_SUPER_ADMIN) {
    saveSession(user, null);
    return { user, company: null };
  }

  if (canonical.active === false) {
    clearSession();
    return { user: null, company: null };
  }

  const company = resolveCompanyForUser(user, storedCompany);
  saveSession(user, company);
  return { user, company };
}

export function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return { user: null, company: null };
    const user = JSON.parse(raw);
    const companyRaw = localStorage.getItem(STORAGE_KEYS.company);
    const company = companyRaw ? JSON.parse(companyRaw) : null;

    if (!isSupabaseEnabled) {
      return sanitizeDemoSession(user, company);
    }

    return { user: toPublicUser(user), company };
  } catch {
    clearSession();
    return { user: null, company: null };
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
  localStorage.removeItem(STORAGE_KEYS.company);
}

/**
 * Login demo (local) ou Supabase Auth.
 */
export async function login({ email, password }) {
  if (!isSupabaseEnabled) {
    ensureDemoCompanyUsers();
    const match = findAuthUserByEmail(email);
    if (!match || match.password !== password || match.active === false) {
      throw new Error('E-mail ou senha inválidos.');
    }
    const user = toPublicUser(match);
    const company =
      user.role === ROLES.PLATFORM_SUPER_ADMIN ? null : resolveCompanyForUser(user, null);
    saveSession(user, company);
    return { user, company };
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message || 'Não foi possível entrar.');

  const user = {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.full_name || data.user.email,
    role: ROLES.COMPANY_ADMIN,
    companyId: null,
  };
  saveSession(user, null);
  return { user, company: null, session: data.session };
}

export async function logout() {
  clearSession();
  if (isSupabaseEnabled) {
    const client = getSupabaseClient();
    await client.auth.signOut();
  }
}

/**
 * Cadastro público: cria empresa (trial) + admin e inicia sessão.
 */
export async function register(payload) {
  if (isSupabaseEnabled) {
    throw new Error('Cadastro via Supabase será habilitado com o backend.');
  }

  const ownerName = String(payload.ownerName || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const passwordConfirm = String(payload.passwordConfirm || '');
  const tradeName = String(payload.tradeName || '').trim();
  const name = String(payload.name || tradeName || '').trim();
  const segment = String(payload.segment || 'hamburgueria').trim();
  const planSlug = PLANS[payload.planSlug] ? payload.planSlug : 'start';

  const errors = {};
  if (ownerName.length < 2) errors.ownerName = 'Informe o seu nome.';
  if (!email.includes('@')) errors.email = 'E-mail inválido.';
  if (password.length < 4) errors.password = 'Senha com ao menos 4 caracteres.';
  if (password !== passwordConfirm) errors.passwordConfirm = 'As senhas não coincidem.';
  if (tradeName.length < 2) errors.tradeName = 'Informe o nome do estabelecimento.';
  if (name.length < 2) errors.name = 'Informe a razão social.';
  if (!SEGMENT_OPTIONS.some((s) => s.value === segment)) {
    errors.segment = 'Segmento inválido.';
  }

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

  const companyId = uid('company');
  const company = updateCompanyProfile(companyId, {
    name,
    tradeName,
    segment,
    planSlug,
    status: 'active',
    idealCmv: 32,
    document: String(payload.document || '').trim(),
    phone: String(payload.phone || '').trim(),
  });

  const owner = bootstrapCompanyOwner(companyId, {
    name: ownerName,
    email,
    password,
  });

  createPlatformCompany({
    id: companyId,
    name,
    tradeName,
    document: company.document,
    segment,
    planSlug,
    status: 'active',
    idealCmv: 32,
    subscriptionStatus: 'trial',
    usersCount: 1,
  });

  registerPlatformUser({
    id: owner.id,
    name: owner.name,
    email: owner.email,
    role: owner.role,
    companyId,
    companyName: tradeName,
    status: 'active',
  });

  return login({ email, password });
}
