import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyCompanyBrand,
  clearCompanyBrand,
  deriveBrandSoft,
  deriveBrandStrong,
  isValidHexColor,
  normalizeBrand,
  resolveCompanyBrand,
} from '@/services/branding.service.js';

describe('branding.service', () => {
  beforeEach(() => {
    clearCompanyBrand();
  });

  it('valida hex', () => {
    expect(isValidHexColor('#0f766e')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(isValidHexColor('red')).toBe(false);
  });

  it('deriva strong e soft a partir da primária', () => {
    expect(deriveBrandStrong('#ff0000')).toMatch(/^#[0-9a-f]{6}$/);
    expect(deriveBrandSoft('#ff0000')).toMatch(/^#[0-9a-f]{6}$/);
    expect(deriveBrandSoft('#ff0000')).not.toBe('#ff0000');
  });

  it('normaliza brand e aplica CSS variables', () => {
    const brand = normalizeBrand({ brandPrimary: '#1D4ED8', brandTagline: 'Delivery' });
    expect(brand.brandPrimary).toBe('#1d4ed8');
    expect(brand.brandTagline).toBe('Delivery');

    applyCompanyBrand({
      id: 'c1',
      brandPrimary: '#b91c1c',
      brandStrong: '#991b1b',
      brandSoft: '#fee2e2',
    });
    expect(document.documentElement.style.getPropertyValue('--brand').trim()).toBe('#b91c1c');
    expect(document.documentElement.dataset.branded).toBe('1');

    clearCompanyBrand();
    expect(document.documentElement.style.getPropertyValue('--brand').trim()).toBe('#0f766e');
  });

  it('resolveCompanyBrand usa default sem empresa', () => {
    expect(resolveCompanyBrand(null).brandPrimary).toBe('#0f766e');
  });
});
