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
import {
  getHomePath,
  mapAuthError,
  mapSupabaseUser,
  resolvePostLoginPath,
} from '@/services/auth-session.util.js';
import { clearSupportTenantAccess } from '@/services/company.service.js';

export { getHomePath, mapAuthError, resolvePostLoginPath };

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

/**
 * Leitura síncrona — modo demo.
 * Com Supabase, preferir `restoreSession()` (valida token real).
 */
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

    // Snapshot local só como cache; boot cloud deve chamar restoreSession().
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

async function fetchSupabaseMembership(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data: profile } = await client
      .from('profiles')
      .select('full_name, is_platform_admin')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_platform_admin) {
      return { isPlatformAdmin: true, fullName: profile.full_name };
    }

    const { data: membership } = await client
      .from('company_users')
      .select(
        'company_id, role, permissions, active, companies ( id, name, trade_name, document, segment, plan_slug, status, ideal_cmv, active )',
      )
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership?.company_id) {
      return {
        isPlatformAdmin: false,
        fullName: profile?.full_name || null,
        companyId: null,
        role: ROLES.COMPANY_ADMIN,
        permissions: null,
        company: null,
      };
    }

    const row = membership.companies;
    return {
      isPlatformAdmin: false,
      fullName: profile?.full_name || null,
      companyId: membership.company_id,
      role: membership.role,
      permissions: membership.permissions || {},
      company: row
        ? {
            id: row.id,
            name: row.name,
            tradeName: row.trade_name || row.name,
            document: row.document || '',
            segment: row.segment || 'outro',
            planSlug: row.plan_slug || 'start',
            status: row.status || 'trial',
            idealCmv: Number(row.ideal_cmv) || 32,
            active: row.active !== false,
          }
        : { id: membership.company_id },
    };
  } catch {
    // Schema ainda não aplicado / rede: não derruba o boot com erro técnico.
    return null;
  }
}

async function hydrateSupabaseSession(authUser) {
  const membership = await fetchSupabaseMembership(authUser.id);
  const user = mapSupabaseUser(authUser, membership);
  if (!user) {
    clearSession();
    return { user: null, company: null };
  }

  const company =
    user.role === ROLES.PLATFORM_SUPER_ADMIN
      ? null
      : membership?.company || (user.companyId ? { id: user.companyId } : null);

  saveSession(user, company);
  return { user, company };
}

/**
 * Restaura sessão no boot do app.
 * Demo: sanitiza localStorage. Cloud: valida getSession() do Supabase.
 */
export async function restoreSession() {
  if (!isSupabaseEnabled) {
    return loadStoredSession();
  }

  const client = getSupabaseClient();
  if (!client) {
    clearSession();
    return { user: null, company: null };
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
      clearSession();
      return { user: null, company: null };
    }
    return hydrateSupabaseSession(data.session.user);
  } catch {
    clearSession();
    return { user: null, company: null };
  }
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
    // Evita amarrar o novo login a um tenant da sessão anterior.
    clearSession();
    clearSupportTenantAccess();
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
  if (error) throw new Error(mapAuthError(error));

  const hydrated = await hydrateSupabaseSession(data.user);
  return { ...hydrated, session: data.session };
}

export async function logout() {
  clearSession();
  clearSupportTenantAccess();
  if (isSupabaseEnabled) {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch {
        // sessão local já limpa
      }
    }
  }
}

/**
 * Cadastro público: cria empresa (trial) + admin e inicia sessão.
 */
export async function register(payload) {
  if (isSupabaseEnabled) {
    throw new Error(mapAuthError({ message: 'Cadastro via Supabase será habilitado com o backend.' }));
  }

  clearSession();
  clearSupportTenantAccess();

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
