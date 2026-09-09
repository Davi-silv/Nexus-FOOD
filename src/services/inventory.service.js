import { INVENTORY_MOVEMENT_TYPES } from '@/core/constants.js';
import { assertCompanyScope } from '@/services/company.service.js';
import { registerIngredientCreatedHandler } from '@/services/domain-events.js';
import {
  adjustIngredientStock,
  getIngredient,
  listIngredients,
} from '@/services/ingredients.service.js';
import { getRecipeByProduct } from '@/services/recipes.service.js';
import { convertQuantity, expandRecipeConsumption } from '@/services/recipe.service.js';
import { validateInventoryMovement } from '@/validations/inventory.validation.js';
import { getStockLevel } from '@/validations/ingredient.validation.js';
import { uid } from '@/core/utils/helpers.js';

function movementsKey(companyId) {
  return `nexus-food:inventory-movements:${companyId}`;
}

function readMovements(companyId) {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(movementsKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((m) => m.companyId === companyId) : [];
  } catch {
    return [];
  }
}

function writeMovements(companyId, rows) {
  localStorage.setItem(movementsKey(companyId), JSON.stringify(rows));
}

function typeMeta(type) {
  return INVENTORY_MOVEMENT_TYPES.find((t) => t.value === type) || null;
}

/**
 * Calcula nova quantidade a partir do tipo de movimento.
 */
export function computeNextQuantity(currentQty, type, quantity) {
  const current = Number(currentQty) || 0;
  const qty = Number(quantity) || 0;
  const meta = typeMeta(type);
  if (!meta) throw new Error('Tipo inválido.');

  if (meta.direction === 'set') return qty;
  if (meta.direction === 'in') return current + qty;
  if (meta.direction === 'out') return current - qty;
  return current;
}

/**
 * Converte quantidade da movimentação para a unidade do ingrediente.
 */
function toIngredientUnit(quantity, fromUnit, ingredientUnit) {
  return convertQuantity(quantity, fromUnit || ingredientUnit, ingredientUnit);
}

export function listInventoryMovements(companyId, { ingredientId, limit = 100 } = {}) {
  let rows = readMovements(companyId)
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (ingredientId) rows = rows.filter((m) => m.ingredientId === ingredientId);
  return rows.slice(0, limit);
}

export function listStockPositions(companyId) {
  const ingredients = listIngredients(companyId).filter((i) => i.status === 'active');
  const movements = readMovements(companyId);

  const lastByIngredient = new Map();
  for (const mov of movements) {
    if (!lastByIngredient.has(mov.ingredientId)) {
      lastByIngredient.set(mov.ingredientId, mov);
    }
  }

  return ingredients
    .map((ing) => {
      const last = lastByIngredient.get(ing.id) || null;
      const quantity = Number(ing.quantity) || 0;
      const unitCost = Number(ing.currentCost) || 0;
      const level = getStockLevel(quantity, ing.minStock);
      return {
        ingredientId: ing.id,
        companyId,
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        quantity,
        minStock: Number(ing.minStock) || 0,
        currentCost: unitCost,
        stockValue: quantity * unitCost,
        level,
        lastMovement: last
          ? {
              id: last.id,
              type: last.type,
              quantity: last.quantity,
              unit: last.unit,
              createdAt: last.createdAt,
              balanceAfter: last.balanceAfter,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const order = { critical: 0, low: 1, normal: 2 };
      const d = (order[a.level] ?? 9) - (order[b.level] ?? 9);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
}

/**
 * Registra movimentação e atualiza quantidade do ingrediente.
 * Nunca altera estoque sem gerar histórico.
 */
export function createInventoryMovement(companyId, payload, { createdBy = null } = {}) {
  if (!companyId) throw new Error('Empresa não definida.');

  const validated = validateInventoryMovement(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const ingredient = getIngredient(companyId, validated.data.ingredientId);
  if (!ingredient || ingredient.status === 'inactive') {
    const err = new Error('Ingrediente inválido ou inativo.');
    err.fieldErrors = { ingredientId: err.message };
    throw err;
  }
  assertCompanyScope(companyId, ingredient.companyId);

  const unit = payload.unit || ingredient.unit;
  const qtyInIngredientUnit = toIngredientUnit(
    validated.data.quantity,
    unit,
    ingredient.unit,
  );

  if (!Number.isFinite(qtyInIngredientUnit) || qtyInIngredientUnit < 0) {
    throw new Error('Quantidade convertida inválida.');
  }

  const balanceBefore = Number(ingredient.quantity) || 0;
  let balanceAfter = computeNextQuantity(
    balanceBefore,
    validated.data.type,
    // para ajuste, quantity já é o saldo absoluto na unidade do ingrediente
    validated.data.type === 'ajuste'
      ? toIngredientUnit(validated.data.quantity, unit, ingredient.unit)
      : qtyInIngredientUnit,
  );

  if (balanceAfter < -0.0001) {
    const err = new Error(
      `Estoque insuficiente. Disponível: ${balanceBefore} ${ingredient.unit}.`,
    );
    err.fieldErrors = { quantity: err.message };
    throw err;
  }
  balanceAfter = Math.max(0, balanceAfter);

  const unitCost =
    validated.data.unitCost !== null && validated.data.unitCost !== undefined
      ? Number(validated.data.unitCost)
      : Number(ingredient.currentCost) || 0;

  const now = new Date().toISOString();
  const movement = {
    id: uid('mov'),
    companyId,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    type: validated.data.type,
    quantity:
      validated.data.type === 'ajuste'
        ? Math.abs(balanceAfter - balanceBefore)
        : qtyInIngredientUnit,
    unit: ingredient.unit,
    unitCost,
    totalCost: (validated.data.type === 'ajuste'
      ? Math.abs(balanceAfter - balanceBefore)
      : qtyInIngredientUnit) * unitCost,
    balanceBefore,
    balanceAfter,
    notes: validated.data.notes,
    referenceType: validated.data.referenceType,
    referenceId: validated.data.referenceId,
    createdBy,
    createdAt: now,
  };

  // Para ajuste, quantity no payload é o novo saldo; delta fica no histórico
  if (validated.data.type === 'ajuste') {
    movement.quantity = Math.abs(balanceAfter - balanceBefore);
    movement.adjustmentTarget = balanceAfter;
    movement.signedDelta = balanceAfter - balanceBefore;
  } else {
    const meta = typeMeta(validated.data.type);
    movement.signedDelta = meta?.direction === 'out' ? -qtyInIngredientUnit : qtyInIngredientUnit;
  }

  const rows = readMovements(companyId);
  writeMovements(companyId, [movement, ...rows]);

  const stockPatch = { quantity: balanceAfter };
  if (validated.data.type === 'compra' || validated.data.type === 'entrada') {
    stockPatch.lastPurchaseAt = now.slice(0, 10);
  }
  adjustIngredientStock(companyId, ingredient.id, stockPatch);

  return movement;
}

/**
 * Baixa automática de estoque a partir de venda + ficha técnica.
 * Estrutura pronta para PDV / registro de vendas (Fases futuras).
 *
 * @example
 * applySaleConsumption(companyId, { productId: 'prd_xbacon', quantity: 2, saleId: 'sale_1' })
 */
export function applySaleConsumption(
  companyId,
  { productId, quantity, saleId = null, createdBy = null, allowPartial = false } = {},
) {
  if (!companyId) throw new Error('Empresa não definida.');
  const soldQty = Number(quantity);
  if (!Number.isFinite(soldQty) || soldQty <= 0) {
    throw new Error('Quantidade vendida inválida.');
  }

  const recipe = getRecipeByProduct(companyId, productId);
  if (!recipe) {
    throw new Error('Produto sem ficha técnica — não é possível baixar estoque automaticamente.');
  }

  const lines = expandRecipeConsumption(recipe.items, soldQty);
  const movements = [];

  for (const line of lines) {
    const ingredient = getIngredient(companyId, line.ingredientId);
    if (!ingredient) {
      if (allowPartial) continue;
      throw new Error(`Ingrediente da ficha não encontrado: ${line.ingredientId}`);
    }

    const qty = convertQuantity(line.quantity, line.unit, ingredient.unit);
    try {
      const mov = createInventoryMovement(
        companyId,
        {
          ingredientId: line.ingredientId,
          type: 'consumo',
          quantity: qty,
          unit: ingredient.unit,
          notes: `Baixa automática — venda ${saleId || productId} (x${soldQty})`,
          referenceType: 'sale',
          referenceId: saleId,
        },
        { createdBy },
      );
      movements.push(mov);
    } catch (err) {
      if (!allowPartial) throw err;
    }
  }

  return {
    productId,
    quantity: soldQty,
    recipeId: recipe.id,
    movements,
  };
}

export function getInventoryStats(companyId) {
  const positions = listStockPositions(companyId);
  return {
    totalItems: positions.length,
    stockValue: positions.reduce((s, p) => s + p.stockValue, 0),
    critical: positions.filter((p) => p.level === 'critical').length,
    low: positions.filter((p) => p.level === 'low').length,
    movementsCount: listInventoryMovements(companyId, { limit: 10000 }).length,
  };
}

export function resetInventoryMovements(companyId) {
  if (!companyId) return;
  localStorage.removeItem(movementsKey(companyId));
}

/**
 * Saldo inicial ao cadastrar ingrediente com quantidade > 0.
 * Gera histórico sem alterar novamente a quantidade.
 */
export function recordOpeningBalance(companyId, ingredient) {
  const qty = Number(ingredient?.quantity) || 0;
  if (!companyId || !ingredient?.id || qty <= 0) return null;

  const now = new Date().toISOString();
  const unitCost = Number(ingredient.currentCost) || 0;
  const movement = {
    id: uid('mov'),
    companyId,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    type: 'entrada',
    quantity: qty,
    unit: ingredient.unit,
    unitCost,
    totalCost: qty * unitCost,
    balanceBefore: 0,
    balanceAfter: qty,
    signedDelta: qty,
    notes: 'Saldo inicial no cadastro',
    referenceType: 'ingredient_create',
    referenceId: ingredient.id,
    createdBy: null,
    createdAt: now,
  };

  const rows = readMovements(companyId);
  writeMovements(companyId, [movement, ...rows]);
  return movement;
}

registerIngredientCreatedHandler((companyId, ingredient) => {
  recordOpeningBalance(companyId, ingredient);
});
