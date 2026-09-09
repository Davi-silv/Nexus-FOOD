import { planHasFeature } from '@/config/plans.config.js';

/**
 * Isolamento multiempresa: toda query de negócio deve filtrar por companyId.
 * No cloud, RLS do Supabase é a barreira real; no client reforçamos o filtro.
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
