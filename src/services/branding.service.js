/** Identidade visual por empresa (white-label leve). */

export const DEFAULT_BRAND = {
  brandPrimary: '#0f766e',
  brandStrong: '#0b5f59',
  brandSoft: '#d9f3ef',
  logoUrl: '',
  brandTagline: '',
};

export const BRAND_PRESETS = [
  { name: 'Teal Nexus', primary: '#0f766e', strong: '#0b5f59', soft: '#d9f3ef' },
  { name: 'Vermelho grill', primary: '#b91c1c', strong: '#991b1b', soft: '#fee2e2' },
  { name: 'Âmbar pizza', primary: '#c2410c', strong: '#9a3412', soft: '#ffedd5' },
  { name: 'Verde fresco', primary: '#15803d', strong: '#166534', soft: '#dcfce7' },
  { name: 'Azul delivery', primary: '#1d4ed8', strong: '#1e40af', soft: '#dbeafe' },
  { name: 'Uva premium', primary: '#6d28d9', strong: '#5b21b6', soft: '#ede9fe' },
];

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(value) {
  return HEX_RE.test(String(value || '').trim());
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Escurece ~18% para brand-strong */
export function deriveBrandStrong(primary) {
  if (!isValidHexColor(primary)) return DEFAULT_BRAND.brandStrong;
  const { r, g, b } = hexToRgb(primary);
  return rgbToHex({ r: r * 0.82, g: g * 0.82, b: b * 0.82 });
}

/** Versão bem clara para brand-soft */
export function deriveBrandSoft(primary) {
  if (!isValidHexColor(primary)) return DEFAULT_BRAND.brandSoft;
  const { r, g, b } = hexToRgb(primary);
  return rgbToHex({
    r: r + (255 - r) * 0.88,
    g: g + (255 - g) * 0.88,
    b: b + (255 - b) * 0.88,
  });
}

export function normalizeBrand(input = {}) {
  const primary = isValidHexColor(input.brandPrimary)
    ? input.brandPrimary.trim().toLowerCase()
    : DEFAULT_BRAND.brandPrimary;

  const strong = isValidHexColor(input.brandStrong)
    ? input.brandStrong.trim().toLowerCase()
    : deriveBrandStrong(primary);

  const soft = isValidHexColor(input.brandSoft)
    ? input.brandSoft.trim().toLowerCase()
    : deriveBrandSoft(primary);

  let logoUrl = String(input.logoUrl || '').trim();
  if (logoUrl && !logoUrl.startsWith('data:image/') && !/^https?:\/\//i.test(logoUrl)) {
    logoUrl = '';
  }
  // data URLs muito grandes: rejeitar na validação de settings

  return {
    brandPrimary: primary,
    brandStrong: strong,
    brandSoft: soft,
    logoUrl,
    brandTagline: String(input.brandTagline || '').trim().slice(0, 80),
  };
}

export function resolveCompanyBrand(company) {
  if (!company) return { ...DEFAULT_BRAND };
  return normalizeBrand(company);
}

/**
 * Aplica CSS variables no documento. Sem company → volta ao padrão Nexus.
 */
export function applyCompanyBrand(company) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const brand = resolveCompanyBrand(company);

  root.style.setProperty('--brand', brand.brandPrimary);
  root.style.setProperty('--brand-strong', brand.brandStrong);
  root.style.setProperty('--brand-soft', brand.brandSoft);
  root.style.setProperty('--profit', brand.brandPrimary);
  root.dataset.branded = company?.id ? '1' : '0';
}

export function clearCompanyBrand() {
  applyCompanyBrand(null);
}

/** Lê arquivo de imagem → data URL (limite 400 KB). */
export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum arquivo selecionado.'));
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      reject(new Error('Use PNG, JPG, WEBP ou SVG.'));
      return;
    }
    if (file.size > 400 * 1024) {
      reject(new Error('Logo deve ter no máximo 400 KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.readAsDataURL(file);
  });
}
