import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { Card, CardHeader } from '@/components/ui/Card.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { KpiCard } from '@/components/ui/KpiCard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { PLANS } from '@/config/plans.config.js';
import {
  getCompanyProfile,
  SEGMENT_OPTIONS,
  updateCompanyProfile,
} from '@/services/settings.service.js';
import {
  BRAND_PRESETS,
  DEFAULT_BRAND,
  deriveBrandSoft,
  deriveBrandStrong,
  readLogoFile,
} from '@/services/branding.service.js';
import { formatPercent } from '@/core/utils/money.js';

export function SettingsPage() {
  const { company, setActiveCompany } = useAuth();
  const toast = useToast();
  const companyId = company?.id;

  const [values, setValues] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setValues(getCompanyProfile(companyId));
  }, [companyId]);

  function setField(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function applyPreset(preset) {
    setValues((v) => ({
      ...v,
      brandPrimary: preset.primary,
      brandStrong: preset.strong,
      brandSoft: preset.soft,
    }));
  }

  function onPrimaryChange(hex) {
    setValues((v) => ({
      ...v,
      brandPrimary: hex,
      brandStrong: deriveBrandStrong(hex),
      brandSoft: deriveBrandSoft(hex),
    }));
  }

  async function onLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readLogoFile(file);
      setField('logoUrl', dataUrl);
      toast.success('Logo carregada.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível carregar a logo.');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!companyId || !values) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const next = updateCompanyProfile(companyId, values);
      setActiveCompany(next);
      setValues(next);
      toast.success('Identidade e configurações salvas.');
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      toast.error(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (!values) {
    return (
      <AppShell title="Configurações" subtitle="Estabelecimento e identidade">
        <Card>
          <p className="muted">Carregando…</p>
        </Card>
      </AppShell>
    );
  }

  const plan = PLANS[values.planSlug] || PLANS.start;

  return (
    <AppShell title="Configurações" subtitle="Estabelecimento, identidade visual e CMV">
      <section className="kpi-grid">
        <KpiCard label="CMV ideal" value={formatPercent(values.idealCmv)} tone="info" />
        <KpiCard label="Plano" value={plan.name} />
        <KpiCard label="Segmento" value={values.segment || '—'} />
        <KpiCard label="Status" value={values.status || 'active'} />
      </section>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader
            title="Identidade visual"
            subtitle="Personalize o sistema com a marca do seu restaurante"
          />
          <div className="brand-preview mb-3" style={{ '--preview-brand': values.brandPrimary }}>
            <div className="brand-preview__bar" />
            <div className="brand-preview__row">
              {values.logoUrl ? (
                <img src={values.logoUrl} alt="Logo" className="brand-logo brand-logo--preview" />
              ) : (
                <div className="brand-mark" aria-hidden="true" />
              )}
              <div>
                <strong>{values.tradeName || 'Sua marca'}</strong>
                <p className="muted">{values.brandTagline || 'Slogan da empresa'}</p>
              </div>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Cor primária</span>
              <div className="color-field">
                <input
                  type="color"
                  value={values.brandPrimary || DEFAULT_BRAND.brandPrimary}
                  onChange={(e) => onPrimaryChange(e.target.value)}
                  aria-label="Cor primária"
                />
                <input
                  className="input"
                  value={values.brandPrimary || ''}
                  onChange={(e) => onPrimaryChange(e.target.value)}
                  placeholder="#0f766e"
                />
              </div>
              {fieldErrors.brandPrimary ? (
                <em className="field-error">{fieldErrors.brandPrimary}</em>
              ) : null}
            </label>
            <label className="form-field">
              <span>Cor forte (botões / hover)</span>
              <div className="color-field">
                <input
                  type="color"
                  value={values.brandStrong || DEFAULT_BRAND.brandStrong}
                  onChange={(e) => setField('brandStrong', e.target.value)}
                  aria-label="Cor forte"
                />
                <input
                  className="input"
                  value={values.brandStrong || ''}
                  onChange={(e) => setField('brandStrong', e.target.value)}
                />
              </div>
              {fieldErrors.brandStrong ? (
                <em className="field-error">{fieldErrors.brandStrong}</em>
              ) : null}
            </label>
            <label className="form-field span-2">
              <span>Slogan / linha sob o nome</span>
              <input
                className="input"
                value={values.brandTagline || ''}
                onChange={(e) => setField('brandTagline', e.target.value)}
                placeholder="Ex.: Hambúrguer artesanal · Delivery"
                maxLength={80}
              />
            </label>
            <label className="form-field span-2">
              <span>Logo (PNG, JPG, WEBP ou SVG · máx. 400 KB)</span>
              <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} />
              {fieldErrors.logoUrl ? <em className="field-error">{fieldErrors.logoUrl}</em> : null}
              {values.logoUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setField('logoUrl', '')}
                >
                  Remover logo
                </Button>
              ) : null}
            </label>
          </div>

          <p className="muted mt-3">Paletas rápidas</p>
          <div className="brand-presets mt-3">
            {BRAND_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="brand-preset"
                style={{ '--swatch': p.primary }}
                onClick={() => applyPreset(p)}
                title={p.name}
              >
                <span className="brand-preset__swatch" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-3">
          <CardHeader title="Estabelecimento" subtitle="Dados do restaurante (isolados por company_id)" />
          <div className="form-grid">
            <label className="form-field">
              <span>Razão social</span>
              <input
                className="input"
                value={values.name || ''}
                onChange={(e) => setField('name', e.target.value)}
                required
              />
              {fieldErrors.name ? <em className="field-error">{fieldErrors.name}</em> : null}
            </label>
            <label className="form-field">
              <span>Nome fantasia</span>
              <input
                className="input"
                value={values.tradeName || ''}
                onChange={(e) => setField('tradeName', e.target.value)}
                required
              />
              {fieldErrors.tradeName ? (
                <em className="field-error">{fieldErrors.tradeName}</em>
              ) : null}
            </label>
            <label className="form-field">
              <span>CNPJ / documento</span>
              <input
                className="input"
                value={values.document || ''}
                onChange={(e) => setField('document', e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Segmento</span>
              <select
                className="input"
                value={values.segment || 'restaurante'}
                onChange={(e) => setField('segment', e.target.value)}
              >
                {SEGMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Telefone</span>
              <input
                className="input"
                value={values.phone || ''}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>WhatsApp</span>
              <input
                className="input"
                value={values.whatsapp || ''}
                onChange={(e) => setField('whatsapp', e.target.value)}
              />
            </label>
            <label className="form-field span-2">
              <span>Endereço</span>
              <input
                className="input"
                value={values.address || ''}
                onChange={(e) => setField('address', e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Cidade</span>
              <input
                className="input"
                value={values.city || ''}
                onChange={(e) => setField('city', e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>UF</span>
              <input
                className="input"
                value={values.state || ''}
                maxLength={2}
                onChange={(e) => setField('state', e.target.value)}
              />
            </label>
          </div>
        </Card>

        <Card className="mt-3">
          <CardHeader
            title="CMV ideal"
            subtitle="Meta usada no dashboard, alertas e relatório de CMV"
          />
          <div className="form-grid">
            <label className="form-field">
              <span>Meta de CMV (%)</span>
              <input
                className="input"
                type="number"
                min={5}
                max={80}
                step={0.1}
                value={values.idealCmv}
                onChange={(e) => setField('idealCmv', e.target.value)}
              />
              {fieldErrors.idealCmv ? (
                <em className="field-error">{fieldErrors.idealCmv}</em>
              ) : null}
            </label>
            <label className="form-field">
              <span>Fuso horário</span>
              <select
                className="input"
                value={values.timezone || 'America/Sao_Paulo'}
                onChange={(e) => setField('timezone', e.target.value)}
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="America/Manaus">America/Manaus</option>
                <option value="America/Fortaleza">America/Fortaleza</option>
              </select>
            </label>
            <label className="form-field span-2">
              <span>Observações internas</span>
              <textarea
                className="input"
                rows={3}
                value={values.notes || ''}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </label>
          </div>
          <div className="form-actions mt-3">
            <Button type="submit" loading={saving}>
              Salvar configurações
            </Button>
          </div>
        </Card>
      </form>
    </AppShell>
  );
}
