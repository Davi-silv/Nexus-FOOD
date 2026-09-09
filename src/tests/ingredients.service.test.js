import { beforeEach, describe, expect, it } from 'vitest';
import {
  createIngredient,
  deactivateIngredient,
  listIngredients,
  resetIngredients,
  updateIngredient,
} from '@/services/ingredients.service.js';
import { validateIngredient, getStockLevel } from '@/validations/ingredient.validation.js';
import { DEMO_COMPANY } from '@/data/demo.js';

const COMPANY_A = 'company_test_a';
const COMPANY_B = 'company_test_b';
const DEMO = DEMO_COMPANY.id;

describe('validateIngredient', () => {
  it('exige nome e unidade válida', () => {
    const result = validateIngredient({
      name: '',
      unit: 'xyz',
      quantity: -1,
      minStock: -2,
      currentCost: -3,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.unit).toBeTruthy();
    expect(result.errors.quantity).toBeTruthy();
  });

  it('aceita payload válido', () => {
    const result = validateIngredient({
      name: 'Bacon',
      category: 'Proteínas',
      unit: 'kg',
      quantity: 1.2,
      minStock: 2,
      currentCost: 38.5,
      status: 'active',
    });
    expect(result.ok).toBe(true);
    expect(result.data.name).toBe('Bacon');
  });

  it('classifica estoque crítico / baixo / normal', () => {
    expect(getStockLevel(1, 2)).toBe('critical');
    expect(getStockLevel(1.5, 2)).toBe('low');
    expect(getStockLevel(5, 2)).toBe('normal');
  });
});

describe('ingredients.service multiempresa', () => {
  beforeEach(() => {
    resetIngredients(COMPANY_A);
    resetIngredients(COMPANY_B);
    resetIngredients(DEMO);
    localStorage.clear();
  });

  it('seed demo só na empresa de demonstração; cliente novo começa vazio', () => {
    const demo = listIngredients(DEMO);
    const a = listIngredients(COMPANY_A);
    expect(demo.length).toBeGreaterThan(0);
    expect(demo.every((r) => r.companyId === DEMO)).toBe(true);
    expect(a).toHaveLength(0);
  });

  it('cadastro novo fica isolado e sem catálogo demo', () => {
    const a = listIngredients(COMPANY_A);
    const b = listIngredients(COMPANY_B);
    expect(a).toHaveLength(0);
    expect(b).toHaveLength(0);
  });

  it('cadastra, edita e desativa ingrediente', () => {
    resetIngredients(COMPANY_A);
    localStorage.removeItem(`nexus-food:ingredients:${COMPANY_A}`);

    // seed vazio forçado
    localStorage.setItem(`nexus-food:ingredients:${COMPANY_A}`, JSON.stringify([]));

    const created = createIngredient(COMPANY_A, {
      name: 'Pão especial',
      category: 'Pães',
      unit: 'un',
      quantity: 40,
      minStock: 20,
      currentCost: 1.5,
      supplierName: 'Padaria Central',
      lastPurchaseAt: '2026-09-01',
      status: 'active',
    });

    expect(created.id).toBeTruthy();
    expect(created.companyId).toBe(COMPANY_A);

    const updated = updateIngredient(COMPANY_A, created.id, {
      ...created,
      currentCost: 1.8,
    });
    expect(updated.currentCost).toBe(1.8);

    const inactive = deactivateIngredient(COMPANY_A, created.id);
    expect(inactive.status).toBe('inactive');
  });

  it('impede nome duplicado ativo na mesma empresa', () => {
    localStorage.setItem(`nexus-food:ingredients:${COMPANY_A}`, JSON.stringify([]));
    createIngredient(COMPANY_A, {
      name: 'Queijo',
      unit: 'kg',
      quantity: 1,
      minStock: 1,
      currentCost: 30,
    });
    expect(() =>
      createIngredient(COMPANY_A, {
        name: 'queijo',
        unit: 'kg',
        quantity: 2,
        minStock: 1,
        currentCost: 31,
      }),
    ).toThrow(/Já existe/);
  });

  it('Company A não enxerga dados gravados só em Company B', () => {
    localStorage.setItem(`nexus-food:ingredients:${COMPANY_A}`, JSON.stringify([]));
    localStorage.setItem(`nexus-food:ingredients:${COMPANY_B}`, JSON.stringify([]));

    createIngredient(COMPANY_B, {
      name: 'Segredo B',
      unit: 'kg',
      quantity: 9,
      minStock: 1,
      currentCost: 10,
    });

    const fromA = listIngredients(COMPANY_A);
    expect(fromA.find((r) => r.name === 'Segredo B')).toBeUndefined();
  });
});
