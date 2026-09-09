import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app.config.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { isPlatformAdmin } from '@/config/roles.config.js';
import { PwaInstallButton } from '@/components/pwa/PwaInstallBanner.jsx';

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isPlatformAdmin(user?.role) ? '/admin' : '/'} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({ email, password });
      toast.success('Login realizado com sucesso.');
      navigate(isPlatformAdmin(result.user.role) ? '/admin' : '/');
    } catch (err) {
      toast.error(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__glow" aria-hidden="true" />
      <div className="login-card">
        <div className="login-card__brand">
          <div className="brand-mark brand-mark--lg" />
          <h1>{APP_CONFIG.name}</h1>
          <p>{APP_CONFIG.slogan}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <div className="login-pwa-row">
          <PwaInstallButton variant="secondary" className="w-full" label="Baixar aplicativo (PWA)" />
        </div>

        <p className="auth-switch">
          Novo por aqui? <Link to="/cadastro">Criar conta do restaurante</Link>
        </p>

        {APP_CONFIG.features.demoMode ? (
          <div className="login-demo">
            <p>Modo demo — contas de teste:</p>
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@nexusfood.local');
                    setPassword('admin');
                  }}
                >
                  Admin restaurante → admin@nexusfood.local / admin
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('estoque@nexusfood.local');
                    setPassword('estoque');
                  }}
                >
                  Funcionário → estoque@nexusfood.local / estoque
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('super@evolutivatech.com.br');
                    setPassword('super');
                  }}
                >
                  Super Admin → super@evolutivatech.com.br / super
                </button>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
