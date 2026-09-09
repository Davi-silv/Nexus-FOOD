import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app.config.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { isPlatformAdmin } from '@/config/roles.config.js';
import { PLANS } from '@/config/plans.config.js';
import { SEGMENT_OPTIONS } from '@/services/settings.service.js';

const EMPTY = {
  ownerName: '',
  email: '',
  password: '',
  passwordConfirm: '',
  tradeName: '',
  name: '',
  segment: 'hamburgueria',
  planSlug: 'start',
  phone: '',
  document: '',
};

export function RegisterPage() {
  const { register, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isPlatformAdmin(user?.role) ? '/admin' : '/'} replace />;
  }

  function setField(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    try {
      await register(values);
      toast.success('Conta criada! Bem-vindo ao Nexus Food.');
      navigate('/');
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__glow" aria-hidden="true" />
      <div className="login-card login-card--wide">
        <div className="login-card__brand">
          <div className="brand-mark brand-mark--lg" />
          <h1>Criar conta</h1>
          <p>Cadastre seu restaurante e comece o trial de 14 dias.</p>
        </div>

        <form className="login-form register-form" onSubmit={handleSubmit}>
          <fieldset className="register-fieldset">
            <legend>Seus dados</legend>
            <label>
              <span>Nome completo</span>
              <input
                value={values.ownerName}
                onChange={(e) => setField('ownerName', e.target.value)}
                autoComplete="name"
                required
              />
              {fieldErrors.ownerName ? <em className="field-error">{fieldErrors.ownerName}</em> : null}
            </label>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                value={values.email}
                onChange={(e) => setField('email', e.target.value)}
                autoComplete="email"
                required
              />
              {fieldErrors.email ? <em className="field-error">{fieldErrors.email}</em> : null}
            </label>
            <label>
              <span>Senha</span>
              <input
                type="password"
                value={values.password}
                onChange={(e) => setField('password', e.target.value)}
                autoComplete="new-password"
                required
              />
              {fieldErrors.password ? <em className="field-error">{fieldErrors.password}</em> : null}
            </label>
            <label>
              <span>Confirmar senha</span>
              <input
                type="password"
                value={values.passwordConfirm}
                onChange={(e) => setField('passwordConfirm', e.target.value)}
                autoComplete="new-password"
                required
              />
              {fieldErrors.passwordConfirm ? (
                <em className="field-error">{fieldErrors.passwordConfirm}</em>
              ) : null}
            </label>
          </fieldset>

          <fieldset className="register-fieldset">
            <legend>Estabelecimento</legend>
            <label>
              <span>Nome fantasia</span>
              <input
                value={values.tradeName}
                onChange={(e) => {
                  const trade = e.target.value;
                  setValues((v) => ({
                    ...v,
                    tradeName: trade,
                    name: !v.name || v.name === v.tradeName ? trade : v.name,
                  }));
                }}
                required
              />
              {fieldErrors.tradeName ? <em className="field-error">{fieldErrors.tradeName}</em> : null}
            </label>
            <label>
              <span>Razão social</span>
              <input
                value={values.name}
                onChange={(e) => setField('name', e.target.value)}
                required
              />
              {fieldErrors.name ? <em className="field-error">{fieldErrors.name}</em> : null}
            </label>
            <label>
              <span>Segmento</span>
              <select value={values.segment} onChange={(e) => setField('segment', e.target.value)}>
                {SEGMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Plano inicial</span>
              <select value={values.planSlug} onChange={(e) => setField('planSlug', e.target.value)}>
                {Object.values(PLANS).map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} — trial
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Telefone (opcional)</span>
              <input
                value={values.phone}
                onChange={(e) => setField('phone', e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label>
              <span>CNPJ (opcional)</span>
              <input value={values.document} onChange={(e) => setField('document', e.target.value)} />
            </label>
          </fieldset>

          <Button type="submit" className="w-full" loading={loading}>
            Criar minha conta
          </Button>
        </form>

        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
        <p className="auth-footnote muted">
          Ao cadastrar, você cria um restaurante isolado por company_id. Cobrança real fica fora do MVP —
          o trial é demonstrativo.
        </p>
      </div>
    </div>
  );
}
