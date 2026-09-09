import { DEMO_RECIPES, isDemoCompany } from '@/data/demo.js';
import { assertCompanyScope, requireCompanyAccess } from '@/services/company.service.js';
import {
  registerIngredientCostHandler,
  registerProductPriceHandler,
} from '@/services/domain-events.js';
import { listIngredients } from '@/services/ingredients.service.js';
import { getProduct, listProducts } from '@/services/products.service.js';
import {
  buildRecipeCostBreakdown,
  calcRecipeMetrics,
} from '@/services/recipe.service.js';
import { validateRecipe } from '@/validations/recipe.validation.js';
import { uid } from '@/core/utils/helpers.js';

function recipesKey(companyId) {
  return `nexus-food:recipes:${companyId}`;
}

function historyKey(companyId) {
  return `nexus-food:recipe-cost-history:${companyId}`;
}

function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeRecipes(companyId, rows) {
  localStorage.setItem(recipesKey(companyId), JSON.stringify(rows));
}

function writeHistory(companyId, rows) {
  localStorage.setItem(historyKey(companyId), JSON.stringify(rows));
}

function buildLines(items, ingredientsById) {
  return (items || []).map((item) => ({
    ...item,
    ingredient: ingredientsById.get(item.ingredientId) || null,
  }));
}

function enrichRecipe(recipe, productsById, ingredientsById) {
  const product = productsById.get(recipe.productId) || null;
  const lines = buildLines(recipe.items, ingredientsById);
  const breakdown = buildRecipeCostBreakdown(lines);
  const salePrice = product ? Number(product.salePrice) || 0 : Number(recipe.salePrice) || 0;
  const metrics = calcRecipeMetrics(salePrice, breakdown.totalCost);

  const itemsDetailed = breakdown.lines.map((line, index) => {
    const raw = lines[index] || {};
    return {
      ingredientId: line.ingredientId || raw.ingredientId,
      quantity: line.quantity ?? raw.quantity,
      unit: line.unit || raw.unit,
      ingredientName: line.ingredientName || raw.ingredient?.name || 'Ingrediente removido',
      ingredientUnit: line.ingredientUnit || raw.ingredient?.unit || raw.unit,
      unitCost: line.unitCost ?? (raw.ingredient ? Number(raw.ingredient.currentCost) || 0 : 0),
      lineCost: line.lineCost || 0,
      qtyConverted: line.qtyConverted ?? null,
      missing: Boolean(line.missing),
      conversionError: line.conversionError || null,
    };
  });

  return {
    ...recipe,
    productName: product?.name || 'Produto removido',
    productCategory: product?.category || null,
    productAvailable: product?.available ?? false,
    productStatus: product?.status || 'inactive',
    salePrice: metrics.salePrice,
    totalCost: metrics.totalCost,
    grossProfit: metrics.grossProfit,
    marginPercent: metrics.marginPercent,
    markup: metrics.markup,
    cmvPercent: metrics.cmvPercent,
    hasConversionErrors: itemsDetailed.some((l) => l.conversionError),
    itemsDetailed,
  };
}

function mapsForCompany(companyId) {
  const ingredientsById = new Map(listIngredients(companyId).map((i) => [i.id, i]));
  const productsById = new Map(listProducts(companyId).map((p) => [p.id, p]));
  return { ingredientsById, productsById };
}

function seedForCompany(companyId) {
  const now = new Date().toISOString();
  const { ingredientsById, productsById } = mapsForCompany(companyId);

  return DEMO_RECIPES.filter((r) => productsById.has(r.productId)).map((r) => {
    const base = {
      id: r.id,
      companyId,
      productId: r.productId,
      items: r.items.map((i) => ({ ...i })),
      createdAt: now,
      updatedAt: now,
    };
    const enriched = enrichRecipe(base, productsById, ingredientsById);
    return {
      id: enriched.id,
      companyId,
      productId: enriched.productId,
      items: enriched.items,
      totalCost: enriched.totalCost,
      salePrice: enriched.salePrice,
      grossProfit: enriched.grossProfit,
      marginPercent: enriched.marginPercent,
      markup: enriched.markup,
      cmvPercent: enriched.cmvPercent,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function readRawRecipes(companyId) {
  if (!companyId) return [];
  let rows = readJson(recipesKey(companyId), null);
  if (rows === null) {
    rows = isDemoCompany(companyId) ? seedForCompany(companyId) : [];
    writeRecipes(companyId, rows);
  }
  return Array.isArray(rows) ? rows.filter((r) => r.companyId === companyId) : [];
}

function persistRecipeRow(companyId, recipe, productsById, ingredientsById) {
  const enriched = enrichRecipe(recipe, productsById, ingredientsById);
  return {
    id: recipe.id,
    companyId,
    productId: recipe.productId,
    items: recipe.items.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: Number(i.quantity),
      unit: i.unit,
    })),
    totalCost: enriched.totalCost,
    salePrice: enriched.salePrice,
    grossProfit: enriched.grossProfit,
    marginPercent: enriched.marginPercent,
    markup: enriched.markup,
    cmvPercent: enriched.cmvPercent,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

function appendHistory(companyId, entry) {
  const history = readJson(historyKey(companyId), []) || [];
  history.unshift({
    id: uid('rch'),
    companyId,
    createdAt: new Date().toISOString(),
    ...entry,
  });
  writeHistory(companyId, history.slice(0, 200));
}

export function listRecipeCostHistory(companyId, { recipeId, limit = 50 } = {}) {
  if (!companyId) return [];
  let rows = (readJson(historyKey(companyId), []) || []).filter((h) => h.companyId === companyId);
  if (recipeId) rows = rows.filter((h) => h.recipeId === recipeId);
  return rows.slice(0, limit);
}

export function listRecipes(companyId) {
  if (!companyId) return [];
  requireCompanyAccess(companyId);
  const raw = readRawRecipes(companyId);
  const { ingredientsById, productsById } = mapsForCompany(companyId);
  return raw
    .map((r) => enrichRecipe(r, productsById, ingredientsById))
    .sort((a, b) => a.productName.localeCompare(b.productName, 'pt-BR'));
}

export function getRecipe(companyId, id) {
  return listRecipes(companyId).find((r) => r.id === id) || null;
}

export function getRecipeByProduct(companyId, productId) {
  return listRecipes(companyId).find((r) => r.productId === productId) || null;
}

export function saveRecipe(companyId, payload, { recipeId = null } = {}) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);

  const ingredients = listIngredients(companyId);
  const ingredientsById = new Map(ingredients.map((i) => [i.id, i]));

  const validated = validateRecipe(payload, { ingredientsById });
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const product = getProduct(companyId, validated.data.productId);
  if (!product || product.status === 'inactive') {
    const err = new Error('Produto inválido ou inativo.');
    err.fieldErrors = { productId: err.message };
    throw err;
  }

  for (const item of validated.data.items) {
    const ing = ingredientsById.get(item.ingredientId);
    if (!ing || ing.status === 'inactive') {
      const err = new Error('Ingrediente inválido ou inativo na ficha.');
      err.fieldErrors = { items: err.message };
      throw err;
    }
  }

  // Garante que o custo fecha (unidades conversíveis).
  try {
    buildRecipeCostBreakdown(
      validated.data.items.map((item) => ({
        ...item,
        ingredient: ingredientsById.get(item.ingredientId),
      })),
    );
  } catch (err) {
    const error = new Error(err.message || 'Não foi possível calcular o custo da ficha.');
    error.fieldErrors = { items: error.message };
    throw error;
  }

  const rows = readRawRecipes(companyId);
  const productsById = new Map(listProducts(companyId).map((p) => [p.id, p]));
  const now = new Date().toISOString();

  const existingIdx = recipeId
    ? rows.findIndex((r) => r.id === recipeId)
    : rows.findIndex((r) => r.productId === validated.data.productId);

  if (!recipeId && existingIdx >= 0) {
    const err = new Error('Este produto já possui ficha técnica.');
    err.fieldErrors = { productId: err.message };
    throw err;
  }

  if (recipeId && existingIdx < 0) {
    throw new Error('Ficha técnica não encontrada.');
  }

  if (existingIdx >= 0) {
    assertCompanyScope(companyId, rows[existingIdx].companyId);
  }

  const previousCost = existingIdx >= 0 ? Number(rows[existingIdx].totalCost) || 0 : null;

  const base = {
    id: existingIdx >= 0 ? rows[existingIdx].id : uid('rcp'),
    companyId,
    productId: validated.data.productId,
    items: validated.data.items,
    createdAt: existingIdx >= 0 ? rows[existingIdx].createdAt : now,
    updatedAt: now,
  };

  const stored = persistRecipeRow(companyId, base, productsById, ingredientsById);
  const next = rows.slice();
  if (existingIdx >= 0) next[existingIdx] = stored;
  else next.push(stored);
  writeRecipes(companyId, next);

  if (previousCost !== null && Math.abs(previousCost - stored.totalCost) > 0.0001) {
    appendHistory(companyId, {
      recipeId: stored.id,
      productId: stored.productId,
      productName: product.name,
      previousCost,
      newCost: stored.totalCost,
      delta: stored.totalCost - previousCost,
      reason: 'recipe_edit',
      source: 'ficha_tecnica',
    });
  }

  return enrichRecipe(stored, productsById, ingredientsById);
}

export function deleteRecipe(companyId, id) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  if (!companyId) throw new Error('Empresa não definida.');
  const rows = readRawRecipes(companyId);
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Ficha técnica não encontrada.');
  assertCompanyScope(companyId, rows[index].companyId);
  const next = rows.filter((r) => r.id !== id);
  writeRecipes(companyId, next);
  return true;
}

/**
 * Recalcula todas as fichas que usam o ingrediente (ex.: mudança de custo).
 * @returns {Array} fichas afetadas
 */
export function recalculateRecipesAffectedByIngredient(
  companyId,
  ingredientId,
  { previousIngredientCost = null, newIngredientCost = null } = {},
) {
  if (!companyId || !ingredientId) return [];
  requireCompanyAccess(companyId);
  const rows = readRawRecipes(companyId);
  const { ingredientsById, productsById } = mapsForCompany(companyId);
  const affected = [];
  const next = rows.map((recipe) => {
    const uses = recipe.items.some((i) => i.ingredientId === ingredientId);
    if (!uses) return recipe;

    const previousCost = Number(recipe.totalCost) || 0;
    const stored = persistRecipeRow(
      companyId,
      { ...recipe, updatedAt: new Date().toISOString() },
      productsById,
      ingredientsById,
    );

    if (Math.abs(previousCost - stored.totalCost) > 0.0001) {
      const product = productsById.get(stored.productId);
      appendHistory(companyId, {
        recipeId: stored.id,
        productId: stored.productId,
        productName: product?.name || stored.productId,
        previousCost,
        newCost: stored.totalCost,
        delta: stored.totalCost - previousCost,
        reason: 'ingredient_price_change',
        ingredientId,
        previousIngredientCost,
        newIngredientCost,
        source: 'ingrediente',
      });
      affected.push(enrichRecipe(stored, productsById, ingredientsById));
    }
    return stored;
  });

  writeRecipes(companyId, next);
  return affected;
}

export function recalculateRecipesAffectedByProduct(companyId, productId) {
  if (!companyId) throw new Error('Empresa não definida.');
  requireCompanyAccess(companyId);
  if (!companyId || !productId) return null;
  const rows = readRawRecipes(companyId);
  const index = rows.findIndex((r) => r.productId === productId);
  if (index < 0) return null;

  const { ingredientsById, productsById } = mapsForCompany(companyId);
  const previousCost = Number(rows[index].totalCost) || 0;
  const stored = persistRecipeRow(
    companyId,
    { ...rows[index], updatedAt: new Date().toISOString() },
    productsById,
    ingredientsById,
  );
  const next = rows.slice();
  next[index] = stored;
  writeRecipes(companyId, next);

  if (Math.abs(previousCost - stored.totalCost) > 0.0001) {
    appendHistory(companyId, {
      recipeId: stored.id,
      productId,
      productName: productsById.get(productId)?.name || productId,
      previousCost,
      newCost: stored.totalCost,
      delta: stored.totalCost - previousCost,
      reason: 'product_price_change',
      source: 'produto',
    });
  }

  return enrichRecipe(stored, productsById, ingredientsById);
}

export function resetRecipes(companyId) {
  if (!companyId) return;
  localStorage.removeItem(recipesKey(companyId));
  localStorage.removeItem(historyKey(companyId));
}

registerIngredientCostHandler((companyId, ingredientId, meta) => {
  recalculateRecipesAffectedByIngredient(companyId, ingredientId, meta);
});

registerProductPriceHandler((companyId, productId) => {
  recalculateRecipesAffectedByProduct(companyId, productId);
});
