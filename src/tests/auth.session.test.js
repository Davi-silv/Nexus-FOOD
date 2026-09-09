import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSession,
  getHomePath,
  loadStoredSession,
  login,
  logout,
  mapAuthError,
  resolvePostLoginPath,
  restoreSession,
} from '@/services/auth.service.js';
import { ROLES } from '@/config/roles.config.js';
import { DEMO_USERS } from '@/data/demo.js';
import { STORAGE_KEYS } from '@/core/constants.js';

describe('auth session helpers', () => {
  it('getHomePath diferencia admin de plataforma e restaurante', () => {
    expect(getHomePath(null)).toBe('/login');
    expect(getHomePath({ role: ROLES.PLATFORM_SUPER_ADMIN })).toBe('/admin');
    expect(getHomePath({ role: ROLES.COMPANY_ADMIN })).toBe('/');
    expect(getHomePath({ role: ROLES.EMPLOYEE })).toBe('/');
  });

  it('resolvePostLoginPath evita loops e open redirect', () => {
    const admin = { role: ROLES.COMPANY_ADMIN };
    const superAdmin = { role: ROLES.PLATFORM_SUPER_ADMIN };

    expect(resolvePostLoginPath(admin, { pathname: '/login' })).toBe('/');
    expect(resolvePostLoginPath(admin, { pathname: '/cadastro' })).toBe('/');
    expect(resolvePostLoginPath(admin, { pathname: '/produtos' })).toBe('/produtos');
    expect(resolvePostLoginPath(admin, { pathname: '/estoque', search: '?q=1' })).toBe(
      '/estoque?q=1',
    );
    expect(resolvePostLoginPath(admin, { pathname: '/admin' })).toBe('/');
    expect(resolvePostLoginPath(admin, { pathname: 'https://evil.com' })).toBe('/');
    expect(resolvePostLoginPath(superAdmin, { pathname: '/admin/empresas' })).toBe(
      '/admin/empresas',
    );
    expect(resolvePostLoginPath(superAdmin, { pathname: '/produtos' })).toBe('/admin');
  });

  it('mapAuthError remove jargão técnico', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toMatch(/e-mail ou senha/i);
    expect(mapAuthError({ message: 'Email not confirmed' })).toMatch(/confirme/i);
    expect(mapAuthError({ message: 'something else' })).not.toMatch(/supabase/i);
  });
});

describe('auth restore / logout (demo)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
  });

  it('restoreSession reidrata login após refresh', async () => {
    await login({ email: DEMO_USERS.admin.email, password: DEMO_USERS.admin.password });
    const restored = await restoreSession();
    expect(restored.user.email).toBe(DEMO_USERS.admin.email);
    expect(restored.company?.id).toBeTruthy();
    expect(restored.user.password).toBeUndefined();
  });

  it('logout limpa sessão persistida', async () => {
    await login({ email: DEMO_USERS.admin.email, password: DEMO_USERS.admin.password });
    await logout();
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
    expect(loadStoredSession().user).toBeNull();
    const restored = await restoreSession();
    expect(restored.user).toBeNull();
  });

  it('sessão adulterada continua sanitizada no restore', async () => {
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({
        id: DEMO_USERS.employee.id,
        email: DEMO_USERS.employee.email,
        role: ROLES.PLATFORM_SUPER_ADMIN,
        companyId: null,
      }),
    );
    const restored = await restoreSession();
    expect(restored.user.role).toBe(ROLES.EMPLOYEE);
  });
});
