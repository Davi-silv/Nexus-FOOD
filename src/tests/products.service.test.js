import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProduct,
  deactivateProduct,
  listProducts,
  resetProducts,
  updateProduct,
} from '@/services/products.service.js';
import { validateProduct } from '@/validations/product.validation.js';

const COMPANY_A = 'company_prod_a';
const COMPANY_B = 'company_prod_b';

describe('validateProduct', () => {
  it('exige nome, categoria e preço válido', () => {
    const result = validateProduct({
      name: '',
      category: '',
      salePrice: -5,
      imageUrl: 'notaurl',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.category).toBeTruthy();
    expect(result.errors.salePrice).toBeTruthy();
    expect(result.errors.imageUrl).toBeTruthy();
  });

  it('aceita produto válido', () => {
    const result = validateProduct({
      name: 'X-Bacon',
      category: 'Hambúrguer',
      description: 'Clássico da casa',
      salePrice: 31.9,
      available: true,
      status: 'active',
    });
    expect(result.ok).toBe(true);
    expect(result.data.salePrice).toBe(31.9);
  });
});

describe('products.service multiempresa', () => {
  beforeEach(() => {
    resetProducts(COMPANY_A);
    resetProducts(COMPANY_B);
    localStorage.clear();
  });

  it('seed isolado por empresa', () => {
    const a = listProducts(COMPANY_A);
    const b = listProducts(COMPANY_B);
    expect(a.some((p) => p.name === 'X-Bacon')).toBe(true);
    expect(a.every((p) => p.companyId === COMPANY_A)).toBe(true);
    expect(b.every((p) => p.companyId === COMPANY_B)).toBe(true);
  });

  it('cadastra, edita e desativa', () => {
    localStorage.setItem(`nexus-food:products:${COMPANY_A}`, JSON.stringify([]));

    const created = createProduct(COMPANY_A, {
      name: 'Smash Burger',
      category: 'Hambúrguer',
      description: 'Duplo smash',
      salePrice: 34.9,
      available: true,
      status: 'active',
    });
    expect(created.companyId).toBe(COMPANY_A);

    const updated = updateProduct(COMPANY_A, created.id, {
      ...created,
      salePrice: 36.9,
    });
    expect(updated.salePrice).toBe(36.9);

    const inactive = deactivateProduct(COMPANY_A, created.id);
    expect(inactive.status).toBe('inactive');
    expect(inactive.available).toBe(false);
  });

  it('impede nome duplicado ativo', () => {
    localStorage.setItem(`nexus-food:products:${COMPANY_A}`, JSON.stringify([]));
    createProduct(COMPANY_A, {
      name: 'Combo Nexus',
      category: 'Combo',
      salePrice: 49.9,
      available: true,
    });
    expect(() =>
      createProduct(COMPANY_A, {
        name: 'combo nexus',
        category: 'Combo',
        salePrice: 50,
        available: true,
      }),
    ).toThrow(/Já existe/);
  });

  it('Company A não vê produtos de Company B', () => {
    localStorage.setItem(`nexus-food:products:${COMPANY_A}`, JSON.stringify([]));
    localStorage.setItem(`nexus-food:products:${COMPANY_B}`, JSON.stringify([]));

    createProduct(COMPANY_B, {
      name: 'Pizza Secreta',
      category: 'Pizza',
      salePrice: 59,
      available: true,
    });

    expect(listProducts(COMPANY_A).find((p) => p.name === 'Pizza Secreta')).toBeUndefined();
  });
});
