import { DEMO_PRODUCTS } from '@/data/demo.js';
import { assertCompanyScope } from '@/services/company.service.js';
import { emitProductPriceChanged } from '@/services/domain-events.js';
import { validateProduct } from '@/validations/product.validation.js';
import { uid } from '@/core/utils/helpers.js';

function storageKey(companyId) {
  return `nexus-food:products:${companyId}`;
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
  return DEMO_PRODUCTS.map((p) => ({
    ...p,
    companyId,
    description: p.description || null,
    imageUrl: p.imageUrl || null,
    available: p.available !== false,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }));
}

export function listProducts(companyId) {
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

export function getProduct(companyId, id) {
  return listProducts(companyId).find((r) => r.id === id) || null;
}

export function createProduct(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  const validated = validateProduct(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const rows = listProducts(companyId);
  const duplicate = rows.some(
    (r) => r.name.toLowerCase() === validated.data.name.toLowerCase() && r.status === 'active',
  );
  if (duplicate) {
    const err = new Error('Já existe um produto ativo com este nome.');
    err.fieldErrors = { name: err.message };
    throw err;
  }

  const now = new Date().toISOString();
  const row = {
    id: uid('prd'),
    companyId,
    ...validated.data,
    createdAt: now,
    updatedAt: now,
  };
  writeAll(companyId, [...rows, row]);
  return row;
}

export function updateProduct(companyId, id, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = listProducts(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Produto não encontrado.');

  assertCompanyScope(companyId, rows[index].companyId);

  const validated = validateProduct({ ...rows[index], ...payload });
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
    const err = new Error('Já existe um produto ativo com este nome.');
    err.fieldErrors = { name: err.message };
    throw err;
  }

  const previousPrice = Number(rows[index].salePrice) || 0;

  const updated = {
    ...rows[index],
    ...validated.data,
    companyId,
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  writeAll(companyId, next);

  const newPrice = Number(updated.salePrice) || 0;
  if (Math.abs(previousPrice - newPrice) > 0.0001) {
    emitProductPriceChanged(companyId, id);
  }

  return updated;
}

export function deactivateProduct(companyId, id) {
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = listProducts(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Produto não encontrado.');
  assertCompanyScope(companyId, rows[index].companyId);

  const updated = {
    ...rows[index],
    status: 'inactive',
    available: false,
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  writeAll(companyId, next);
  return updated;
}

export function reactivateProduct(companyId, id) {
  return updateProduct(companyId, id, { status: 'active', available: true });
}

export function resetProducts(companyId) {
  if (!companyId) return;
  localStorage.removeItem(storageKey(companyId));
}
