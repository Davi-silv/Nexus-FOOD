import { planHasFeature } from '@/config/plans.config.js';
import { isPlatformAdmin, ROLES } from '@/config/roles.config.js';
import { STORAGE_KEYS } from '@/core/constants.js';

const SUPPORT_CONTEXT_KEY = 'nexus-food:support-context';

/**
 * Isolamento multiempresa: toda query de negócio deve filtrar por companyId.
 * No cloud, RLS do Supabase é a barreira real; no client reforçamos o filtro + amarração à sessão.
 */
export function assertCompanyScope(companyId, recordCompanyId) {
  if (!companyId || !recordCompanyId || companyId !== recordCompanyId) {
    throw new Error('Acesso negado: dados de outra empresa.');
  }
}

export function filterByCompany(records, companyId) {
  if (!companyId) return [];
  return (records || []).filter((r) => r.companyId === companyId || r.company_id === companyId);
}

export function companyCanUseFeature(company, featureKey) {
  if (!company) return false;
  return planHasFeature(company.planSlug || 'start', featureKey);
}

/** Ator da sessão atual (sem senha). Null se não houver sessão. */
export function getSessionActor() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user?.id && !user?.email) return null;
    const { password: _pw, ...safe } = user;
    return safe;
  } catch {
    return null;
  }
}

export function getSupportTenantAccess() {
  try {
    const raw = localStorage.getItem(SUPPORT_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.companyId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSupportTenantAccess() {
  localStorage.removeItem(SUPPORT_CONTEXT_KEY);
}

/**
 * Super Admin só acessa dados operacionais de um cliente após registrar suporte.
 */
export function beginSupportTenantAccess({ companyId, reason, adminUserId, adminName }) {
  assertPlatformAdminSession();
  if (!companyId) throw new Error('Empresa não definida.');
  const trimmed = String(reason || '').trim();
  if (trimmed.length < 5) {
    throw new Error('Informe um motivo de suporte com ao menos 5 caracteres.');
  }
  const payload = {
    companyId,
    reason: trimmed,
    adminUserId: adminUserId || null,
    adminName: adminName || null,
    at: new Date().toISOString(),
  };
  localStorage.setItem(SUPPORT_CONTEXT_KEY, JSON.stringify(payload));
  return payload;
}

export function assertPlatformAdminSession() {
  const user = getSessionActor();
  if (!user || !isPlatformAdmin(user.role)) {
    throw new Error('Acesso negado: exclusivo da plataforma.');
  }
  return user;
}

/**
 * Amarra companyId ao tenant da sessão.
 * - Sem sessão: permite (testes de domínio / bootstrap de cadastro).
 * - company_admin/employee: só a própria empresa.
 * - platform_super_admin: só com modo suporte ativo para aquela empresa.
 */
export function requireCompanyAccess(companyId) {
  if (!companyId) throw new Error('Empresa não definida.');
  const user = getSessionActor();
  if (!user) return null;

  if (isPlatformAdmin(user.role)) {
    const support = getSupportTenantAccess();
    if (support?.companyId === companyId) return user;
    throw new Error('Acesso negado: registre o modo suporte para esta empresa.');
  }

  if (user.companyId !== companyId) {
    throw new Error('Acesso negado: dados de outra empresa.');
  }
  return user;
}

/**
 * Impede setActiveCompany cruzar tenant sem autorização.
 */
export function assertCanActivateCompany(user, company) {
  if (!user) throw new Error('Sessão inválida.');
  if (!company?.id) {
    // Super Admin pode limpar empresa ativa ao encerrar suporte.
    if (isPlatformAdmin(user.role)) return true;
    throw new Error('Empresa inválida.');
  }

  if (isPlatformAdmin(user.role)) {
    const support = getSupportTenantAccess();
    if (support?.companyId !== company.id) {
      throw new Error('Ative o modo suporte antes de abrir dados desta empresa.');
    }
    return true;
  }

  if (user.role === ROLES.PLATFORM_SUPER_ADMIN) {
    throw new Error('Acesso negado.');
  }

  if (user.companyId !== company.id) {
    throw new Error('Acesso negado: não é possível alternar para outra empresa.');
  }
  return true;
}
