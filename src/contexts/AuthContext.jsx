import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  getHomePath,
  login as loginService,
  logout as logoutService,
  mapAuthError,
  register as registerService,
  resolvePostLoginPath,
  restoreSession,
} from '@/services/auth.service.js';
import { canAccessModule, isPlatformAdmin } from '@/config/roles.config.js';
import { STORAGE_KEYS } from '@/core/constants.js';
import { isSupabaseEnabled } from '@/config/supabase.config.js';
import { getSupabaseClient } from '@/lib/supabase.js';
import { applyCompanyBrand, clearCompanyBrand } from '@/services/branding.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    async function boot() {
      try {
        const session = await restoreSession();
        if (cancelled) return;
        setUser(session.user);
        setCompany(session.company);
        setBootError(null);
      } catch (err) {
        if (cancelled) return;
        setBootError(mapAuthError(err));
        clearSession();
        setUser(null);
        setCompany(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();

    if (isSupabaseEnabled) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = client.auth.onAuthStateChange(async (event) => {
          if (cancelled) return;
          if (event === 'SIGNED_OUT') {
            clearSession();
            setUser(null);
            setCompany(null);
            clearCompanyBrand();
            return;
          }
          if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            try {
              const session = await restoreSession();
              if (cancelled) return;
              setUser(session.user);
              setCompany(session.company);
            } catch {
              if (cancelled) return;
              clearSession();
              setUser(null);
              setCompany(null);
            }
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
      }
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (company?.id && !isPlatformAdmin(user?.role)) {
      applyCompanyBrand(company);
    } else {
      clearCompanyBrand();
    }
  }, [company, user?.role]);

  async function login(credentials) {
    try {
      const result = await loginService(credentials);
      setUser(result.user);
      setCompany(result.company);
      return result;
    } catch (err) {
      const friendly = new Error(mapAuthError(err));
      friendly.fieldErrors = err.fieldErrors;
      throw friendly;
    }
  }

  async function register(payload) {
    try {
      const result = await registerService(payload);
      setUser(result.user);
      setCompany(result.company);
      return result;
    } catch (err) {
      if (err.fieldErrors) throw err;
      const friendly = new Error(mapAuthError(err));
      throw friendly;
    }
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
      homePath: getHomePath(user),
      resolvePostLoginPath: (from) => resolvePostLoginPath(user, from),
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
