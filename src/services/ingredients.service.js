import { DEMO_INGREDIENTS } from '@/data/demo.js';
import { assertCompanyScope } from '@/services/company.service.js';
import {
  emitIngredientCostChanged,
  emitIngredientCreated,
} from '@/services/domain-events.js';
import { validateIngredient } from '@/validations/ingredient.validation.js';
import { uid } from '@/core/utils/helpers.js';

function storageKey(companyId) {
  return `nexus-food:ingredients:${companyId}`;
}

function readAll(companyId) {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeAll(companyId, rows) {
  localStorage.setItem(storageKey(companyId), JSON.stringify(rows));
}

function seedForCompany(companyId) {
  const now = new Date().toISOString();
  return DEMO_INGREDIENTS.map((ing) => ({
    ...ing,
    companyId,
    category: ing.category || null,
    supplierId: null,
    supplierName: null,
    lastPurchaseAt: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Lista ingredientes da empresa. Faz seed demo na primeira carga.
 */
export function listIngredients(companyId) {
  if (!companyId) return [];
  let rows = readAll(companyId);
  if (rows === null) {
    rows = seedForCompany(companyId);
    writeAll(companyId, rows);
  }
  return rows
    .filter((r) => r.companyId === companyId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function getIngredient(companyId, id) {
  return listIngredients(companyId).find((r) => r.id === id) || null;
}

/**
 * @param {string} companyId
 * @param {Record<string, unknown>} payload
 */
export function createIngredient(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  const validated = validateIngredient(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const rows = listIngredients(companyId);
  const duplicate = rows.some(
    (r) => r.name.toLowerCase() === validated.data.name.toLowerCase() && r.status === 'active',
  );
  if (duplicate) {
    const err = new Error('Já existe um ingrediente ativo com este nome.');
    err.fieldErrors = { name: err.message };
    throw err;
  }

  const now = new Date().toISOString();
  const row = {
    id: uid('ing'),
    companyId,
    ...validated.data,
    createdAt: now,
    updatedAt: now,
  };
  writeAll(companyId, [...rows, row]);
  emitIngredientCreated(companyId, row);
  return row;
}

/**
 * @param {string} companyId
 * @param {string} id
 * @param {Record<string, unknown>} payload
 */
export function updateIngredient(companyId, id, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = listIngredients(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Ingrediente não encontrado.');

  assertCompanyScope(companyId, rows[index].companyId);

  const validated = validateIngredient({ ...rows[index], ...payload });
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const duplicate = rows.some(
    (r) =>
      r.id !== id &&
      r.name.toLowerCase() === validated.data.name.toLowerCase() &&
      r.status === 'active',
  );
  if (duplicate) {
    const err = new Error('Já existe um ingrediente ativo com este nome.');
    err.fieldErrors = { name: err.message };
    throw err;
  }

  const previousCost = Number(rows[index].currentCost) || 0;

  const updated = {
    ...rows[index],
    ...validated.data,
    // quantidade só muda via movimentação de estoque
    quantity: Number(rows[index].quantity) || 0,
    companyId,
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  writeAll(companyId, next);

  const newCost = Number(updated.currentCost) || 0;
  if (Math.abs(previousCost - newCost) > 0.0001) {
    emitIngredientCostChanged(companyId, id, {
      previousIngredientCost: previousCost,
      newIngredientCost: newCost,
    });
  }

  return updated;
}

/**
 * Altera quantidade em estoque. Deve ser chamado somente após registrar movimentação.
 */
export function adjustIngredientStock(companyId, id, { quantity, lastPurchaseAt } = {}) {
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = listIngredients(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Ingrediente não encontrado.');
  assertCompanyScope(companyId, rows[index].companyId);

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 0) {
    throw new Error('Quantidade de estoque inválida.');
  }

  const updated = {
    ...rows[index],
    quantity: qty,
    updatedAt: new Date().toISOString(),
  };
  if (lastPurchaseAt) {
    updated.lastPurchaseAt = lastPurchaseAt;
  }

  const next = rows.slice();
  next[index] = updated;
  writeAll(companyId, next);
  return updated;
}

/**
 * Soft-delete: marca inactive (preserva histórico futuro de fichas/estoque).
 */
export function deactivateIngredient(companyId, id) {
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = listIngredients(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Ingrediente não encontrado.');
  assertCompanyScope(companyId, rows[index].companyId);

  const updated = {
    ...rows[index],
    status: 'inactive',
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  writeAll(companyId, next);
  return updated;
}

export function reactivateIngredient(companyId, id) {
  return updateIngredient(companyId, id, { status: 'active' });
}

/** Utilitário de teste / reset demo */
export function resetIngredients(companyId) {
  if (!companyId) return;
  localStorage.removeItem(storageKey(companyId));
}
