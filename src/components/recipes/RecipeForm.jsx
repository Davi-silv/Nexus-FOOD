import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UNITS } from '@/core/constants.js';
import { Button } from '@/components/ui/Button.jsx';
import { formatMoney, formatPercent } from '@/core/utils/money.js';
import {
  areUnitsCompatible,
  buildRecipeCostBreakdown,
  calcRecipeMetrics,
} from '@/services/recipe.service.js';

function emptyItem() {
  return { ingredientId: '', quantity: '1', unit: 'g' };
}

function unitsForIngredient(ingredientUnit) {
  if (!ingredientUnit) return UNITS;
  return UNITS.filter((u) => areUnitsCompatible(u.value, ingredientUnit));
}

export function RecipeForm({
  initial,
  products,
  ingredients,
  productsWithRecipe,
  fieldErrors = {},
  idealCmv = 32,
  onSubmit,
  onCancel,
  loading,
}) {
  const [productId, setProductId] = useState(initial?.productId || '');
  const [items, setItems] = useState(() =>
    initial?.items?.length
      ? initial.items.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: String(i.quantity),
          unit: i.unit,
        }))
      : [emptyItem()],
  );

  useEffect(() => {
    setProductId(initial?.productId || '');
    setItems(
      initial?.items?.length
        ? initial.items.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: String(i.quantity),
            unit: i.unit,
          }))
        : [emptyItem()],
    );
  }, [initial]);

  const availableProducts = useMemo(() => {
    const blocked = new Set(productsWithRecipe || []);
    return (products || []).filter((p) => {
      if (p.status === 'inactive') return false;
      if (initial?.productId && p.id === initial.productId) return true;
      return !blocked.has(p.id);
    });
  }, [products, productsWithRecipe, initial?.productId]);

  const activeIngredients = useMemo(
    () => (ingredients || []).filter((i) => i.status === 'active'),
    [ingredients],
  );

  const ingredientsById = useMemo(
    () => new Map(activeIngredients.map((i) => [i.id, i])),
    [activeIngredients],
  );

  const live = useMemo(() => {
    const product = products.find((p) => p.id === productId);
    const lines = items
      .filter((i) => i.ingredientId)
      .map((i) => ({
        ingredientId: i.ingredientId,
        quantity: Number(i.quantity) || 0,
        unit: i.unit,
        ingredient: ingredientsById.get(i.ingredientId),
      }));
    const breakdown = buildRecipeCostBreakdown(lines);
    const metrics = calcRecipeMetrics(product?.salePrice || 0, breakdown.totalCost);
    return { breakdown, metrics, product };
  }, [items, productId, products, ingredientsById]);

  function updateItem(index, patch) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleIngredientChange(index, ingredientId) {
    const ing = ingredientsById.get(ingredientId);
    const nextUnit = ing?.unit || items[index].unit;
    updateItem(index, {
      ingredientId,
      unit: nextUnit,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      productId,
      items: items.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: Number(i.quantity),
        unit: i.unit,
      })),
    });
  }

  const hasConversionError = live.breakdown.lines.some((l) => l.conversionError);
  const cmvTone =
    live.metrics.cmvPercent > Number(idealCmv || 32) ? 'text-cost' : 'text-profit';

  return (
    <form className="recipe-form" onSubmit={handleSubmit} noValidate>
      <p className="recipe-form__hint">
        Produto → ingredientes → quantidade → custo proporcional → margem e CMV.
      </p>

      <label className="form-field">
        <span>Produto *</span>
        <select
          className="input"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={Boolean(initial?.id)}
        >
          <option value="">Selecione…</option>
          {availableProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatMoney(p.salePrice)}
            </option>
          ))}
        </select>
        {fieldErrors.productId ? <em className="field-error">{fieldErrors.productId}</em> : null}
      </label>

      <div className="recipe-items">
        <div className="recipe-items__head">
          <h4>Ingredientes da ficha</h4>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <Plus size={14} />
            Linha
          </Button>
        </div>
        {fieldErrors.items ? <em className="field-error">{fieldErrors.items}</em> : null}

        {items.map((item, index) => {
          const ing = ingredientsById.get(item.ingredientId);
          const unitOptions = unitsForIngredient(ing?.unit);
          const line = live.breakdown.lines.find((l) => l.ingredientId === item.ingredientId);
          return (
            <div key={index} className="recipe-item-row recipe-item-row--rich">
              <label className="form-field">
                <span>Ingrediente</span>
                <select
                  className="input"
                  value={item.ingredientId}
                  onChange={(e) => handleIngredientChange(index, e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {activeIngredients.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} ({formatMoney(row.currentCost)}/{row.unit})
                    </option>
                  ))}
                </select>
                {fieldErrors[`item_${index}_ingredient`] ? (
                  <em className="field-error">{fieldErrors[`item_${index}_ingredient`]}</em>
                ) : null}
              </label>

              <label className="form-field">
                <span>Qtd</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: e.target.value })}
                />
                {fieldErrors[`item_${index}_quantity`] ? (
                  <em className="field-error">{fieldErrors[`item_${index}_quantity`]}</em>
                ) : null}
              </label>

              <label className="form-field">
                <span>Unidade</span>
                <select
                  className="input"
                  value={item.unit}
                  onChange={(e) => updateItem(index, { unit: e.target.value })}
                >
                  {unitOptions.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                {fieldErrors[`item_${index}_unit`] ? (
                  <em className="field-error">{fieldErrors[`item_${index}_unit`]}</em>
                ) : null}
              </label>

              <div className="recipe-item-row__cost">
                <span>Custo linha</span>
                <strong>
                  {line?.conversionError ? '—' : formatMoney(line?.lineCost || 0)}
                </strong>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="recipe-item-row__remove"
                onClick={() => removeItem(index)}
                aria-label="Remover linha"
                disabled={items.length <= 1}
              >
                <Trash2 size={15} />
              </Button>

              {line?.conversionError ? (
                <em className="field-error recipe-item-row__error">{line.conversionError}</em>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="recipe-live-metrics">
        <div>
          <span>Custo total</span>
          <strong>{formatMoney(live.metrics.totalCost)}</strong>
        </div>
        <div>
          <span>Preço de venda</span>
          <strong>{formatMoney(live.metrics.salePrice)}</strong>
        </div>
        <div>
          <span>Lucro bruto</span>
          <strong>{formatMoney(live.metrics.grossProfit)}</strong>
        </div>
        <div>
          <span>Margem</span>
          <strong>{formatPercent(live.metrics.marginPercent)}</strong>
        </div>
        <div>
          <span>Markup</span>
          <strong>{live.metrics.markup.toFixed(2)}x</strong>
        </div>
        <div>
          <span>CMV</span>
          <strong className={cmvTone}>{formatPercent(live.metrics.cmvPercent)}</strong>
        </div>
      </div>

      {live.product && live.metrics.salePrice > 0 ? (
        <p className="recipe-insight">
          {live.product.name} custa aproximadamente{' '}
          <strong>{formatMoney(live.metrics.totalCost)}</strong> para produzir. Com preço de{' '}
          <strong>{formatMoney(live.metrics.salePrice)}</strong>, a margem bruta estimada é{' '}
          <strong>{formatPercent(live.metrics.marginPercent)}</strong>
          {live.metrics.cmvPercent > Number(idealCmv || 32)
            ? ` (CMV acima da meta de ${idealCmv}%).`
            : ` (CMV dentro da meta de ${idealCmv}%).`}
        </p>
      ) : null}

      {hasConversionError ? (
        <p className="field-error">
          Corrija as unidades incompatíveis antes de salvar a ficha técnica.
        </p>
      ) : null}

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={hasConversionError}>
          Salvar ficha
        </Button>
      </div>
    </form>
  );
}
