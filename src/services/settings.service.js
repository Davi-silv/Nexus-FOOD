import { DEMO_COMPANY } from '@/data/demo.js';
import { STORAGE_KEYS } from '@/core/constants.js';
import { DEFAULT_BRAND, isValidHexColor, normalizeBrand } from '@/services/branding.service.js';

function key(companyId) {
  return `nexus-food:settings:${companyId}`;
}

const DEFAULTS = {
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  state: '',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  notes: '',
  ...DEFAULT_BRAND,
};

function readOverlay(companyId) {
  try {
    const raw = localStorage.getItem(key(companyId));
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeOverlay(companyId, data) {
  localStorage.setItem(key(companyId), JSON.stringify(data));
}

/**
 * Perfil do estabelecimento (company + restaurant_settings overlay).
 */
export function getCompanyProfile(companyId) {
  if (!companyId) return null;
  const base =
    companyId === DEMO_COMPANY.id
      ? { ...DEMO_COMPANY }
      : {
          id: companyId,
          name: 'Empresa',
          tradeName: 'Empresa',
          document: '',
          segment: 'restaurante',
          planSlug: 'start',
          status: 'active',
          idealCmv: 32,
        };

  const overlay = readOverlay(companyId);
  const merged = {
    ...base,
    ...DEFAULTS,
    ...overlay,
    id: companyId,
    idealCmv: Number(overlay.idealCmv ?? base.idealCmv) || 32,
  };
  return {
    ...merged,
    ...normalizeBrand(merged),
  };
}

export function updateCompanyProfile(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');

  const errors = {};
  const name = String(payload.name ?? '').trim();
  const tradeName = String(payload.tradeName ?? '').trim();
  const idealCmv = Number(payload.idealCmv);

  if (name.length < 2) errors.name = 'Informe a razão social.';
  if (tradeName.length < 2) errors.tradeName = 'Informe o nome fantasia.';
  if (!Number.isFinite(idealCmv) || idealCmv < 5 || idealCmv > 80) {
    errors.idealCmv = 'CMV ideal deve estar entre 5% e 80%.';
  }

  if (payload.brandPrimary != null && payload.brandPrimary !== '' && !isValidHexColor(payload.brandPrimary)) {
    errors.brandPrimary = 'Cor primária inválida (use #RRGGBB).';
  }
  if (payload.brandStrong != null && payload.brandStrong !== '' && !isValidHexColor(payload.brandStrong)) {
    errors.brandStrong = 'Cor forte inválida (use #RRGGBB).';
  }
  if (payload.logoUrl && String(payload.logoUrl).startsWith('data:') && String(payload.logoUrl).length > 550_000) {
    errors.logoUrl = 'Logo muito grande. Use arquivo até 400 KB.';
  }

  if (Object.keys(errors).length) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = errors;
    throw err;
  }

  const current = getCompanyProfile(companyId);
  const brand = normalizeBrand({
    brandPrimary: payload.brandPrimary ?? current.brandPrimary,
    brandStrong: payload.brandStrong ?? current.brandStrong,
    brandSoft: payload.brandSoft ?? current.brandSoft,
    logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : current.logoUrl,
    brandTagline: payload.brandTagline !== undefined ? payload.brandTagline : current.brandTagline,
  });

  const next = {
    ...current,
    name,
    tradeName,
    document: String(payload.document ?? '').trim(),
    segment: String(payload.segment ?? current.segment ?? 'restaurante').trim(),
    planSlug: payload.planSlug || current.planSlug || 'start',
    status: payload.status || current.status || 'active',
    idealCmv,
    phone: String(payload.phone ?? '').trim(),
    whatsapp: String(payload.whatsapp ?? '').trim(),
    address: String(payload.address ?? '').trim(),
    city: String(payload.city ?? '').trim(),
    state: String(payload.state ?? '').trim().toUpperCase().slice(0, 2),
    timezone: String(payload.timezone || 'America/Sao_Paulo'),
    currency: 'BRL',
    notes: String(payload.notes ?? '').trim(),
    ...brand,
    updatedAt: new Date().toISOString(),
  };

  const { id: _id, ...overlay } = next;
  writeOverlay(companyId, overlay);

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.company);
    if (raw) {
      const sessionCompany = JSON.parse(raw);
      if (sessionCompany?.id === companyId) {
        localStorage.setItem(STORAGE_KEYS.company, JSON.stringify(next));
      }
    }
  } catch {
    /* ignore */
  }

  return next;
}

export function resetCompanySettings(companyId) {
  if (!companyId) return;
  localStorage.removeItem(key(companyId));
}

export const SEGMENT_OPTIONS = [
  { value: 'hamburgueria', label: 'Hamburgueria' },
  { value: 'pizzaria', label: 'Pizzaria' },
  { value: 'lanchonete', label: 'Lanchonete' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'delivery', label: 'Delivery' },
];
