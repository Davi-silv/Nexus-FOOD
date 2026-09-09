import { assertCompanyScope, requireCompanyAccess } from '@/services/company.service.js';
import { createInventoryMovement } from '@/services/inventory.service.js';
import {
  getIngredient,
  listIngredients,
  updateIngredient,
} from '@/services/ingredients.service.js';
import {
  getSupplier,
  listSuppliers,
  recordIngredientPriceChange,
} from '@/services/suppliers.service.js';
import { createPayable, createTransaction } from '@/services/finance.service.js';
import { validatePurchase } from '@/validations/purchase.validation.js';
import { uid } from '@/core/utils/helpers.js';

function purchasesKey(companyId) {
  return `nexus-food:purchases:${companyId}`;
}

function readPurchases(companyId) {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(purchasesKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => p.companyId === companyId) : [];
  } catch {
    return [];
  }
}

function writePurchases(companyId, rows) {
  localStorage.setItem(purchasesKey(companyId), JSON.stringify(rows));
}

export function listPurchases(companyId) {
  if (!companyId) return [];
  requireCompanyAccess(companyId);
  return readPurchases(companyId)
    .slice()
    .sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate)));
}

/**
 * Cria compra. Se status for confirmed/paid/parcelado, aplica efeitos:
 * estoque + custo + histórico de preço + recálculo de fichas (via updateIngredient).
 */
export function createPurchase(companyId, payload, { createdBy = null } = {}) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  if (!companyId) throw new Error('Empresa não definida.');
  listSuppliers(companyId);
  listIngredients(companyId);

  const validated = validatePurchase(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  let supplier = null;
  if (validated.data.supplierId) {
    supplier = getSupplier(companyId, validated.data.supplierId);
    if (!supplier) {
      const err = new Error('Fornecedor inválido.');
      err.fieldErrors = { supplierId: err.message };
      throw err;
    }
  }

  for (const item of validated.data.items) {
    const ing = getIngredient(companyId, item.ingredientId);
    if (!ing || ing.status === 'inactive') {
      const err = new Error('Item com ingrediente inválido.');
      err.fieldErrors = { items: err.message };
      throw err;
    }
  }

  const now = new Date().toISOString();
  const purchase = {
    id: uid('pur'),
    companyId,
    supplierId: validated.data.supplierId,
    supplierName: supplier?.name || null,
    purchaseDate: validated.data.purchaseDate,
    paymentMethod: validated.data.paymentMethod,
    status: validated.data.status,
    notes: validated.data.notes,
    items: validated.data.items,
    total: validated.data.total,
    createdBy,
    createdAt: now,
    updatedAt: now,
    appliedAt: null,
  };

  const shouldApply = ['confirmed', 'paid', 'parcelado'].includes(purchase.status);
  if (shouldApply) {
    applyPurchaseEffects(companyId, purchase, { createdBy });
    purchase.appliedAt = now;

    // lança despesa financeira da compra
    try {
      createTransaction(companyId, {
        type: 'expense',
        description: `Compra ${purchase.supplierName ? `— ${purchase.supplierName}` : purchase.id}`,
        amount: purchase.total,
        date: purchase.purchaseDate,
        paymentMethod: purchase.paymentMethod || 'pix',
        categoryId: 'cat_compras',
        notes: `Compra ${purchase.id}`,
      });
    } catch {
      /* seed financeiro pode ainda não existir — createTransaction garante seed */
    }
  } else if (purchase.status === 'pending') {
    try {
      createPayable(companyId, {
        description: `Compra pendente ${purchase.supplierName || ''}`.trim(),
        amount: purchase.total,
        dueDate: purchase.purchaseDate,
        status: 'pending',
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        categoryId: 'cat_compras',
        notes: purchase.id,
      });
    } catch {
      /* ignore */
    }
  }

  const rows = readPurchases(companyId);
  writePurchases(companyId, [purchase, ...rows]);
  return purchase;
}

function applyPurchaseEffects(companyId, purchase, { createdBy } = {}) {
  for (const item of purchase.items) {
    const ingredient = getIngredient(companyId, item.ingredientId);
    if (!ingredient) continue;

    createInventoryMovement(
      companyId,
      {
        ingredientId: item.ingredientId,
        type: 'compra',
        quantity: item.quantity,
        unit: ingredient.unit,
        unitCost: item.unitPrice,
        notes: `Compra ${purchase.id}${purchase.supplierName ? ` — ${purchase.supplierName}` : ''}`,
        referenceType: 'purchase',
        referenceId: purchase.id,
      },
      { createdBy },
    );

    const previousCost = Number(ingredient.currentCost) || 0;
    const newCost = Number(item.unitPrice) || 0;

    if (Math.abs(previousCost - newCost) > 0.0001) {
      updateIngredient(companyId, ingredient.id, {
        ...getIngredient(companyId, ingredient.id),
        currentCost: newCost,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        lastPurchaseAt: purchase.purchaseDate,
      });

      recordIngredientPriceChange(companyId, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        previousCost,
        newCost,
        source: 'purchase',
      });
    } else {
      updateIngredient(companyId, ingredient.id, {
        ...getIngredient(companyId, ingredient.id),
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        lastPurchaseAt: purchase.purchaseDate,
      });
    }
  }
}

/**
 * Confirma compra pendente aplicando efeitos.
 */
export function confirmPurchase(companyId, purchaseId, { createdBy = null } = {}) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  const rows = readPurchases(companyId);
  const index = rows.findIndex((p) => p.id === purchaseId);
  if (index < 0) throw new Error('Compra não encontrada.');
  assertCompanyScope(companyId, rows[index].companyId);

  const purchase = rows[index];
  if (purchase.appliedAt) throw new Error('Esta compra já foi aplicada ao estoque.');
  if (purchase.status === 'cancelled') throw new Error('Compra cancelada.');

  const updated = {
    ...purchase,
    status: purchase.status === 'pending' ? 'confirmed' : purchase.status,
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  applyPurchaseEffects(companyId, updated, { createdBy });

  const next = rows.slice();
  next[index] = updated;
  writePurchases(companyId, next);
  return updated;
}

export function resetPurchases(companyId) {
  if (!companyId) return;
  localStorage.removeItem(purchasesKey(companyId));
}
