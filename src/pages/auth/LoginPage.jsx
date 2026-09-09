import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app.config.js';
import { DEMO_USERS } from '@/data/demo.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { Button } from '@/components/ui/Button.jsx';
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
  const { login, resolvePostLoginPath } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState('');

  async function authenticate(nextEmail, nextPassword) {
    setFormError('');
    const result = await login({ email: nextEmail, password: nextPassword });
    toast.success('Login realizado com sucesso.');
    navigate(resolvePostLoginPath(location.state?.from), { replace: true });
    return result;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authenticate(email, password);
    } catch (err) {
      const message = err.message || 'Não foi possível entrar.';
      setFormError(message);
      toast.error(message);
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
      const message = err.message || 'Não foi possível abrir a demonstração.';
      setFormError(message);
      toast.error(message);
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
          <p className="login-card__title">Bem-vindo de volta</p>
          <p>Acesse a gestão do seu restaurante.</p>
        </div>

        {location.state?.reason === 'no_company' ? (
          <p className="login-form-error" role="alert">
            Sua sessão não está vinculada a um estabelecimento. Entre novamente ou fale com o
            suporte.
          </p>
        ) : null}

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

        <form className="login-form" onSubmit={handleSubmit} noValidate>
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
            <div className="login-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </label>
          {formError ? (
            <p className="login-form-error" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={loading} variant="secondary">
            Entrar
          </Button>
        </form>

        <p className="auth-switch auth-switch--muted">
          <span>Esqueci minha senha</span> — em breve
        </p>

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
                      setFormError('');
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
