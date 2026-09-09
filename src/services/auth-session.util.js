import { isPlatformAdmin, ROLES } from '@/config/roles.config.js';

/**
 * Destino padrão após login / sessão válida.
 */
export function getHomePath(user) {
  if (!user) return '/login';
  return isPlatformAdmin(user.role) ? '/admin' : '/';
}

/**
 * Evita open-redirect e loops (/login ↔ app).
 * @param {import('react-router-dom').Location | { pathname?: string, search?: string } | null | undefined} from
 * @param {{ role?: string } | null | undefined} user
 */
export function resolvePostLoginPath(user, from) {
  const home = getHomePath(user);
  const pathname = from?.pathname;
  if (!pathname || typeof pathname !== 'string') return home;

  if (pathname === '/login' || pathname === '/cadastro') return home;
  if (!pathname.startsWith('/')) return home;

  const isAdminPath = pathname.startsWith('/admin');
  if (isPlatformAdmin(user?.role)) {
    return isAdminPath ? `${pathname}${from.search || ''}` : home;
  }

  if (isAdminPath) return home;
  return `${pathname}${from.search || ''}`;
}

export function isAuthPublicPath(pathname) {
  return pathname === '/login' || pathname === '/cadastro';
}

/** Mensagens amigáveis (sem jargão técnico do provider). */
export function mapAuthError(error) {
  const raw = String(error?.message || error || '').toLowerCase();
  if (!raw) return 'Não foi possível entrar. Tente novamente.';
  if (raw.includes('invalid login') || raw.includes('invalid credentials')) {
    return 'E-mail ou senha inválidos.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (raw.includes('too many requests') || raw.includes('rate limit')) {
    return 'Muitas tentativas. Aguarde um momento e tente de novo.';
  }
  if (raw.includes('network') || raw.includes('fetch')) {
    return 'Falha de conexão. Verifique a internet e tente novamente.';
  }
  if (raw.includes('cadastro via supabase')) {
    return 'Cadastro online ainda não está disponível neste ambiente.';
  }
  return 'Não foi possível concluir a autenticação. Tente novamente.';
}

export function mapSupabaseUser(authUser, membership = null) {
  if (!authUser) return null;

  if (membership?.isPlatformAdmin) {
    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.full_name || authUser.email,
      role: ROLES.PLATFORM_SUPER_ADMIN,
      companyId: null,
      permissions: null,
    };
  }

  const role = membership?.role === ROLES.EMPLOYEE ? ROLES.EMPLOYEE : ROLES.COMPANY_ADMIN;

  return {
    id: authUser.id,
    email: authUser.email,
    name:
      membership?.fullName ||
      authUser.user_metadata?.full_name ||
      authUser.email,
    role,
    companyId: membership?.companyId || null,
    permissions: role === ROLES.EMPLOYEE ? membership?.permissions || {} : null,
  };
}
