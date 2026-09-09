import { WASTE_REASONS } from '@/core/constants.js';
import { createInventoryMovement } from '@/services/inventory.service.js';
import { getIngredient, listIngredients } from '@/services/ingredients.service.js';
import { validateWaste } from '@/validations/waste.validation.js';
import { uid } from '@/core/utils/helpers.js';

function wasteKey(companyId) {
  return `nexus-food:waste:${companyId}`;
}

function readWaste(companyId) {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(wasteKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w) => w.companyId === companyId) : [];
  } catch {
    return [];
  }
}

function writeWaste(companyId, rows) {
  localStorage.setItem(wasteKey(companyId), JSON.stringify(rows));
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function listWasteRecords(companyId) {
  listIngredients(companyId);
  return readWaste(companyId)
    .slice()
    .sort((a, b) => String(b.wasteDate).localeCompare(String(a.wasteDate)));
}

export function createWasteRecord(companyId, payload, { createdBy = null } = {}) {
  if (!companyId) throw new Error('Empresa não definida.');

  const validated = validateWaste(payload);
  if (!validated.ok) {
    const err = new Error('Dados inválidos.');
    err.fieldErrors = validated.errors;
    throw err;
  }

  const ingredient = getIngredient(companyId, validated.data.ingredientId);
  if (!ingredient || ingredient.status === 'inactive') {
    const err = new Error('Ingrediente inválido.');
    err.fieldErrors = { ingredientId: err.message };
    throw err;
  }

  const unitCost = Number(ingredient.currentCost) || 0;
  const totalLoss = validated.data.quantity * unitCost;
  const reasonLabel =
    WASTE_REASONS.find((r) => r.value === validated.data.reason)?.label || validated.data.reason;

  const movement = createInventoryMovement(
    companyId,
    {
      ingredientId: ingredient.id,
      type: 'perda',
      quantity: validated.data.quantity,
      unit: ingredient.unit,
      unitCost,
      notes: `Desperdício — ${reasonLabel}${validated.data.notes ? `: ${validated.data.notes}` : ''}`,
      referenceType: 'waste',
      referenceId: null,
    },
    { createdBy },
  );

  const now = new Date().toISOString();
  const record = {
    id: uid('wst'),
    companyId,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    quantity: validated.data.quantity,
    unit: ingredient.unit,
    unitCost,
    totalLoss,
    reason: validated.data.reason,
    reasonLabel,
    employeeName: validated.data.employeeName,
    notes: validated.data.notes,
    wasteDate: validated.data.wasteDate,
    movementId: movement.id,
    createdBy,
    createdAt: now,
  };

  // link reference
  // (movement já criado; referenceId ficaria null — ok para MVP)

  const rows = readWaste(companyId);
  writeWaste(companyId, [record, ...rows]);
  return record;
}

export function getWasteStats(companyId) {
  const records = listWasteRecords(companyId);
  const today = startOfDay(new Date());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  function sumSince(from) {
    return records
      .filter((r) => {
        const d = startOfDay(`${r.wasteDate}T12:00:00`);
        return d >= from;
      })
      .reduce((s, r) => s + (Number(r.totalLoss) || 0), 0);
  }

  const byIngredient = new Map();
  const monthRecords = records.filter((r) => {
    const d = startOfDay(`${r.wasteDate}T12:00:00`);
    return d >= monthStart;
  });
  for (const r of monthRecords) {
    const cur = byIngredient.get(r.ingredientId) || {
      ingredientId: r.ingredientId,
      name: r.ingredientName,
      totalLoss: 0,
      quantity: 0,
    };
    cur.totalLoss += Number(r.totalLoss) || 0;
    cur.quantity += Number(r.quantity) || 0;
    byIngredient.set(r.ingredientId, cur);
  }

  const ranking = [...byIngredient.values()].sort((a, b) => b.totalLoss - a.totalLoss);

  return {
    today: sumSince(today),
    week: sumSince(weekAgo),
    month: sumSince(monthStart),
    ranking,
    count: records.length,
  };
}

export function resetWaste(companyId) {
  if (!companyId) return;
  localStorage.removeItem(wasteKey(companyId));
}
