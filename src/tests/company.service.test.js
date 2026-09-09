import { describe, expect, it } from 'vitest';
import { canAccessModule, ROLES } from '@/config/roles.config.js';
import { assertCompanyScope, filterByCompany } from '@/services/company.service.js';

describe('multiempresa / permissões', () => {
  it('admin acessa financeiro; funcionário sem permissão não', () => {
    expect(canAccessModule(ROLES.COMPANY_ADMIN, {}, 'finance')).toBe(true);
    expect(canAccessModule(ROLES.EMPLOYEE, { finance: false }, 'finance')).toBe(false);
    expect(canAccessModule(ROLES.EMPLOYEE, { inventory: true }, 'inventory')).toBe(true);
  });

  it('filtra registros por company_id', () => {
    const rows = [
      { id: 1, companyId: 'A' },
      { id: 2, companyId: 'B' },
      { id: 3, company_id: 'A' },
    ];
    expect(filterByCompany(rows, 'A')).toHaveLength(2);
    expect(filterByCompany(rows, 'B')).toHaveLength(1);
  });

  it('bloqueia acesso cross-company', () => {
    expect(() => assertCompanyScope('A', 'B')).toThrow(/outra empresa/);
  });
});
