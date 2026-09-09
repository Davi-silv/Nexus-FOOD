import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCompanyUser,
  deactivateCompanyUser,
  findAuthUserByEmail,
  listCompanyUsers,
  resetCompanyUsers,
  updateCompanyUser,
} from '@/services/users.service.js';
import {
  getCompanyProfile,
  resetCompanySettings,
  updateCompanyProfile,
} from '@/services/settings.service.js';
import { login, loadStoredSession, clearSession } from '@/services/auth.service.js';
import { DEMO_COMPANY } from '@/data/demo.js';
import { ROLES } from '@/config/roles.config.js';
import { STORAGE_KEYS } from '@/core/constants.js';

const COMPANY = DEMO_COMPANY.id;

describe('users.service', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    resetCompanyUsers(COMPANY);
  });

  it('seed inclui admin e funcionário demo', () => {
    const users = listCompanyUsers(COMPANY);
    expect(users.some((u) => u.role === ROLES.COMPANY_ADMIN)).toBe(true);
    expect(users.some((u) => u.role === ROLES.EMPLOYEE)).toBe(true);
  });

  it('cria funcionário com permissões e permite login', async () => {
    const created = createCompanyUser(COMPANY, {
      name: 'Maria Estoque',
      email: 'maria@nexusfood.local',
      password: 'maria123',
      role: ROLES.EMPLOYEE,
      permissions: { inventory: true, waste: true, finance: false },
    });
    expect(created.password).toBeUndefined();
    expect(created.permissions.finance).toBe(false);
    expect(created.permissions.inventory).toBe(true);

    const auth = await login({ email: 'maria@nexusfood.local', password: 'maria123' });
    expect(auth.user.email).toBe('maria@nexusfood.local');
    expect(auth.user.permissions.finance).toBe(false);
    expect(auth.company.id).toBe(COMPANY);
  });

  it('não remove o último admin', () => {
    const admin = listCompanyUsers(COMPANY).find((u) => u.role === ROLES.COMPANY_ADMIN);
    expect(() => deactivateCompanyUser(COMPANY, admin.id)).toThrow(/administrador/i);
  });

  it('atualiza permissões do funcionário na fonte canônica', () => {
    const staff = listCompanyUsers(COMPANY).find((u) => u.role === ROLES.EMPLOYEE);
    updateCompanyUser(COMPANY, staff.id, {
      permissions: { ...staff.permissions, purchases: true, finance: false },
    });
    const found = findAuthUserByEmail(staff.email);
    expect(found.permissions.purchases).toBe(true);
    expect(found.permissions.finance).toBe(false);
  });
});

describe('settings.service', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    resetCompanySettings(COMPANY);
  });

  it('atualiza CMV ideal e sincroniza sessão', async () => {
    await login({ email: 'admin@nexusfood.local', password: 'admin' });
    const next = updateCompanyProfile(COMPANY, {
      name: 'Hamburgueria Nexus Ltda',
      tradeName: 'Nexus Burger',
      idealCmv: 28,
      segment: 'hamburgueria',
      document: '12.345.678/0001-90',
    });
    expect(next.idealCmv).toBe(28);
    expect(next.tradeName).toBe('Nexus Burger');
    expect(getCompanyProfile(COMPANY).idealCmv).toBe(28);

    const sessionCompany = JSON.parse(localStorage.getItem(STORAGE_KEYS.company));
    expect(sessionCompany.idealCmv).toBe(28);
    expect(sessionCompany.tradeName).toBe('Nexus Burger');

    const reloaded = loadStoredSession();
    expect(reloaded.company.idealCmv).toBe(28);
  });

  it('valida faixa do CMV ideal', () => {
    expect(() =>
      updateCompanyProfile(COMPANY, {
        name: 'Teste',
        tradeName: 'Teste',
        idealCmv: 95,
      }),
    ).toThrow();
  });

  it('persiste identidade visual por empresa', async () => {
    await login({ email: 'admin@nexusfood.local', password: 'admin' });
    const next = updateCompanyProfile(COMPANY, {
      name: 'Hamburgueria Nexus Ltda',
      tradeName: 'Nexus Burger',
      idealCmv: 30,
      brandPrimary: '#b91c1c',
      brandTagline: 'Smash na brasa',
      logoUrl: 'data:image/png;base64,aaa',
    });
    expect(next.brandPrimary).toBe('#b91c1c');
    expect(next.brandStrong).toMatch(/^#[0-9a-f]{6}$/);
    expect(next.brandTagline).toBe('Smash na brasa');
    expect(getCompanyProfile(COMPANY).logoUrl).toContain('data:image/png');

    const other = 'company_brand_b';
    resetCompanySettings(other);
    const profileB = getCompanyProfile(other);
    expect(profileB.brandPrimary).not.toBe('#b91c1c');
  });
});
