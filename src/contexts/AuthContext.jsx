import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  loadStoredSession,
  login as loginService,
  logout as logoutService,
  register as registerService,
} from '@/services/auth.service.js';
import { canAccessModule, isPlatformAdmin } from '@/config/roles.config.js';
import { STORAGE_KEYS } from '@/core/constants.js';
import { applyCompanyBrand, clearCompanyBrand } from '@/services/branding.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);

  useEffect(() => {
    try {
      const { user: storedUser, company: storedCompany } = loadStoredSession();
      setUser(storedUser);
      setCompany(storedCompany);
    } catch (err) {
      setBootError(err.message);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (company?.id && !isPlatformAdmin(user?.role)) {
      applyCompanyBrand(company);
    } else {
      clearCompanyBrand();
    }
  }, [company, user?.role]);

  async function login(credentials) {
    const result = await loginService(credentials);
    setUser(result.user);
    setCompany(result.company);
    return result;
  }

  async function register(payload) {
    const result = await registerService(payload);
    setUser(result.user);
    setCompany(result.company);
    return result;
  }

  async function logout() {
    await logoutService();
    setUser(null);
    setCompany(null);
    clearCompanyBrand();
  }

  function setActiveCompany(next) {
    setCompany(next);
    if (next) {
      localStorage.setItem(STORAGE_KEYS.company, JSON.stringify(next));
      applyCompanyBrand(next);
    }
  }

  const value = useMemo(
    () => ({
      user,
      company,
      loading,
      bootError,
      isAuthenticated: Boolean(user),
      isPlatformAdmin: isPlatformAdmin(user?.role),
      canAccess: (moduleKey) => canAccessModule(user?.role, user?.permissions, moduleKey),
      login,
      register,
      logout,
      setActiveCompany,
    }),
    [user, company, loading, bootError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
