import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';

export function ProtectedRoute({ requirePlatformAdmin = false, permission }) {
  const { isAuthenticated, loading, isPlatformAdmin, canAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <Skeleton height={24} width={180} />
        <Skeleton height={120} className="mt-4" />
      </div>
    );
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

  if (permission && !canAccess(permission) && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
