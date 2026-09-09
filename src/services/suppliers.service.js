import { assertCompanyScope } from '@/services/company.service.js';
import { listIngredients } from '@/services/ingredients.service.js';
import { validateSupplier } from '@/validations/supplier.validation.js';
import { uid } from '@/core/utils/helpers.js';

function suppliersKey(companyId) {
  return `nexus-food:suppliers:${companyId}`;
}

function priceHistoryKey(companyId) {
  return `nexus-food:ingredient-price-history:${companyId}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeSuppliers(companyId, rows) {
  localStorage.setItem(suppliersKey(companyId), JSON.stringify(rows));
}

function writePriceHistory(companyId, rows) {
  localStorage.setItem(priceHistoryKey(companyId), JSON.stringify(rows));
}

function seedSuppliers(companyId) {
  const now = new Date().toISOString();
  const ingredients = listIngredients(companyId);
  const ids = Object.fromEntries(ingredients.map((i) => [i.name, i.id]));

  return [
    {
      id: 'sup_carnes',
      companyId,
      name: 'Carnes Premium Ltda',
      document: '11.222.333/0001-44',
      phone: '(11) 3333-1000',
      whatsapp: '(11) 99999-1000',
      email: 'vendas@carnespremium.local',
      contactName: 'Roberto',
      notes: 'Fornecedor principal de proteínas',
      status: 'active',
      ingredientIds: [ids.Carne, ids.Bacon].filter(Boolean),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sup_hortifruti',
      companyId,
      name: 'Horta & Cia',
      document: null,
      phone: '(11) 3444-2000',
      whatsapp: '(11) 98888-2000',
      email: 'pedidos@horta.local',
      contactName: 'Marina',
      notes: null,
      status: 'active',
      ingredientIds: [ids.Alface, ids.Tomate, ids.Batata].filter(Boolean),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sup_padaria',
      companyId,
      name: 'Padaria Central',
      document: '22.333.444/0001-55',
      phone: '(11) 3555-3000',
      whatsapp: '(11) 97777-3000',
      email: null,
      contactName: 'Paulo',
      notes: 'Pães diários',
      status: 'active',
      ingredientIds: [ids['Pão brioche']].filter(Boolean),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function seedPriceHistory(companyId) {
  const ingredients = listIngredients(companyId);
  const carne = ingredients.find((i) => i.id === 'ing_carne' || i.name === 'Carne');
  if (!carne) return [];
  const now = Date.now();
  return [
    {
      id: 'iph_demo_1',
      companyId,
      ingredientId: carne.id,
      ingredientName: carne.name,
      supplierId: 'sup_carnes',
      supplierName: 'Carnes Premium Ltda',
      previousCost: 21.9,
      newCost: 24.5,
      variationPercent: ((24.5 - 21.9) / 21.9) * 100,
      source: 'demo',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 20).toISOString(),
    },
    {
      id: 'iph_demo_2',
      companyId,
      ingredientId: carne.id,
      ingredientName: carne.name,
      supplierId: 'sup_carnes',
      supplierName: 'Carnes Premium Ltda',
      previousCost: 24.5,
      newCost: carne.currentCost,
      variationPercent: ((carne.currentCost - 24.5) / 24.5) * 100,
      source: 'demo',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ];
}

export function listSuppliers(companyId) {
  if (!companyId) return [];
  let rows = readJson(suppliersKey(companyId), null);
  if (rows === null) {
    rows = seedSuppliers(companyId);
    writeSuppliers(companyId, rows);
    const history = seedPriceHistory(companyId);
    writePriceHistory(companyId, history);
  }
  return rows
    .filter((r) => r.companyId === companyId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function getSupplier(companyId, id) {
  return listSuppliers(companyId).find((s) => s.id === id) || null;
}

export function createSupplier(companyId, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  const validated = validateSupplier(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const rows = listSuppliers(companyId);
  const duplicate = rows.some(
    (r) => r.name.toLowerCase() === validated.data.name.toLowerCase() && r.status === 'active',
  );
  if (duplicate) {
    const err = new Error('Já existe um fornecedor ativo com este nome.');
    err.fieldErrors = { name: err.message };
    throw err;
  }

  const now = new Date().toISOString();
  const row = {
    id: uid('sup'),
    companyId,
    ...validated.data,
    createdAt: now,
    updatedAt: now,
  };
  writeSuppliers(companyId, [...rows, row]);
  return row;
}

export function updateSupplier(companyId, id, payload) {
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = listSuppliers(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Fornecedor não encontrado.');
  assertCompanyScope(companyId, rows[index].companyId);

  const validated = validateSupplier({ ...rows[index], ...payload });
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const updated = {
    ...rows[index],
    ...validated.data,
    companyId,
    updatedAt: new Date().toISOString(),
  };
  const next = rows.slice();
  next[index] = updated;
  writeSuppliers(companyId, next);
  return updated;
}

export function deactivateSupplier(companyId, id) {
  return updateSupplier(companyId, id, { status: 'inactive' });
}

export function listIngredientPriceHistory(companyId, { ingredientId, limit = 50 } = {}) {
  if (!companyId) return [];
  // ensure suppliers seed (also seeds price history)
  listSuppliers(companyId);
  let rows = readJson(priceHistoryKey(companyId), []) || [];
  rows = rows.filter((r) => r.companyId === companyId);
  if (ingredientId) rows = rows.filter((r) => r.ingredientId === ingredientId);
  return rows
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

/**
 * Registra variação de preço de ingrediente (compras / atualização manual).
 */
export function recordIngredientPriceChange(
  companyId,
  {
    ingredientId,
    ingredientName,
    supplierId = null,
    supplierName = null,
    previousCost,
    newCost,
    source = 'purchase',
  },
) {
  if (!companyId || !ingredientId) return null;
  const prev = Number(previousCost) || 0;
  const next = Number(newCost) || 0;
  if (Math.abs(prev - next) < 0.0001) return null;

  const variationPercent = prev > 0 ? ((next - prev) / prev) * 100 : null;
  const entry = {
    id: uid('iph'),
    companyId,
    ingredientId,
    ingredientName: ingredientName || ingredientId,
    supplierId,
    supplierName,
    previousCost: prev,
    newCost: next,
    variationPercent,
    source,
    createdAt: new Date().toISOString(),
  };

  listSuppliers(companyId); // ensure key exists
  const rows = readJson(priceHistoryKey(companyId), []) || [];
  writePriceHistory(companyId, [entry, ...rows].slice(0, 300));
  return entry;
}

export function resetSuppliers(companyId) {
  if (!companyId) return;
  localStorage.removeItem(suppliersKey(companyId));
  localStorage.removeItem(priceHistoryKey(companyId));
}
