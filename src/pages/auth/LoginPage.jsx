import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app.config.js';
import { DEMO_USERS } from '@/data/demo.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { isPlatformAdmin } from '@/config/roles.config.js';
import { PwaInstallButton } from '@/components/pwa/PwaInstallBanner.jsx';

const DEMO_ACCOUNTS = [
  {
    key: 'admin',
    label: 'Admin restaurante (dados preenchidos)',
    email: DEMO_USERS.admin.email,
    password: DEMO_USERS.admin.password,
  },
  {
    key: 'employee',
    label: 'Funcionário (sem financeiro)',
    email: DEMO_USERS.employee.email,
    password: DEMO_USERS.employee.password,
  },
  {
    key: 'super',
    label: 'Super Admin (painel Evolutiva)',
    email: DEMO_USERS.superAdmin.email,
    password: DEMO_USERS.superAdmin.password,
  },
];

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isPlatformAdmin(user?.role) ? '/admin' : '/'} replace />;
  }

  async function authenticate(nextEmail, nextPassword) {
    const result = await login({ email: nextEmail, password: nextPassword });
    toast.success('Login realizado com sucesso.');
    navigate(isPlatformAdmin(result.user.role) ? '/admin' : '/');
    return result;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authenticate(email, password);
    } catch (err) {
      toast.error(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function enterDemoRestaurant() {
    setDemoLoading(true);
    setEmail(DEMO_USERS.admin.email);
    setPassword(DEMO_USERS.admin.password);
    try {
      await authenticate(DEMO_USERS.admin.email, DEMO_USERS.admin.password);
    } catch (err) {
      toast.error(err.message || 'Não foi possível abrir a demonstração.');
    } finally {
      setDemoLoading(false);
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

        {APP_CONFIG.features.demoMode ? (
          <div className="login-demo-hero">
            <p className="login-demo-hero__title">Conta demonstração ativa</p>
            <p className="login-demo-hero__text">
              Hamburgueria Nexus com ingredientes, fichas, estoque e financeiro preenchidos para
              apresentar o sistema.
            </p>
            <Button
              type="button"
              className="w-full"
              loading={demoLoading}
              onClick={enterDemoRestaurant}
            >
              Entrar na demonstração
            </Button>
          </div>
        ) : null}

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
          <Button type="submit" className="w-full" loading={loading} variant="secondary">
            Entrar com minha conta
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
            <p>Outras contas de teste:</p>
            <ul>
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    {account.label} → {account.email} / {account.password}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
