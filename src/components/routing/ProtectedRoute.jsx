import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { ROLES } from '@/config/roles.config.js';

function AuthBootScreen() {
  return (
    <div className="auth-loading" role="status" aria-live="polite" aria-label="Carregando sessão">
      <Skeleton height={24} width={180} />
      <Skeleton height={120} className="mt-4" />
    </div>
  );
}

/**
 * Protege rotas privadas: espera boot da sessão antes de decidir redirect.
 * Evita flash de conteúdo privado e loops de redirecionamento.
 */
export function ProtectedRoute({ requirePlatformAdmin = false, permission }) {
  const { user, company, isAuthenticated, loading, isPlatformAdmin, canAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthBootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!requirePlatformAdmin && isPlatformAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  // Sessão cloud sem empresa vinculada: não liberar módulos do restaurante.
  if (
    !requirePlatformAdmin &&
    !isPlatformAdmin &&
    user?.role !== ROLES.PLATFORM_SUPER_ADMIN &&
    !company?.id
  ) {
    return <Navigate to="/login" replace state={{ from: location, reason: 'no_company' }} />;
  }

  if (permission && !canAccess(permission) && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/** Login/cadastro: não renderiza formulário até validar sessão (evita flicker). */
export function GuestRoute({ children }) {
  const { isAuthenticated, loading, homePath } = useAuth();

  if (loading) {
    return <AuthBootScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={homePath} replace />;
  }

  return children;
}
