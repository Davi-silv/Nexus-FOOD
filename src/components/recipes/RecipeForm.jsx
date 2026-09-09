import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UNITS } from '@/core/constants.js';
import { Button } from '@/components/ui/Button.jsx';
import { formatMoney } from '@/core/utils/money.js';
import { calcRecipeCost, calcRecipeMetrics } from '@/services/recipe.service.js';

function emptyItem() {
  return { ingredientId: '', quantity: '1', unit: 'g' };
}

export function RecipeForm({
  initial,
  products,
  ingredients,
  productsWithRecipe,
  fieldErrors = {},
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

  const liveMetrics = useMemo(() => {
    const product = products.find((p) => p.id === productId);
    const lines = items
      .filter((i) => i.ingredientId)
      .map((i) => ({
        quantity: Number(i.quantity) || 0,
        unit: i.unit,
        ingredient: ingredientsById.get(i.ingredientId),
      }));
    const totalCost = calcRecipeCost(lines);
    return calcRecipeMetrics(product?.salePrice || 0, totalCost);
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
    updateItem(index, {
      ingredientId,
      unit: ing?.unit || items[index].unit,
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

  return (
    <form className="recipe-form" onSubmit={handleSubmit} noValidate>
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
          <h4>Ingredientes</h4>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <Plus size={14} />
            Linha
          </Button>
        </div>
        {fieldErrors.items ? <em className="field-error">{fieldErrors.items}</em> : null}

        {items.map((item, index) => (
          <div key={index} className="recipe-item-row">
            <label className="form-field">
              <span>Ingrediente</span>
              <select
                className="input"
                value={item.ingredientId}
                onChange={(e) => handleIngredientChange(index, e.target.value)}
              >
                <option value="">Selecione…</option>
                {activeIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({formatMoney(ing.currentCost)}/{ing.unit})
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
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>

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
          </div>
        ))}
      </div>

      <div className="recipe-live-metrics">
        <div>
          <span>Custo</span>
          <strong>{formatMoney(liveMetrics.totalCost)}</strong>
        </div>
        <div>
          <span>Venda</span>
          <strong>{formatMoney(liveMetrics.salePrice)}</strong>
        </div>
        <div>
          <span>Lucro bruto</span>
          <strong>{formatMoney(liveMetrics.grossProfit)}</strong>
        </div>
        <div>
          <span>Margem</span>
          <strong>{liveMetrics.marginPercent.toFixed(2)}%</strong>
        </div>
        <div>
          <span>Markup</span>
          <strong>{liveMetrics.markup.toFixed(2)}x</strong>
        </div>
        <div>
          <span>CMV</span>
          <strong>{liveMetrics.cmvPercent.toFixed(2)}%</strong>
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Salvar ficha
        </Button>
      </div>
    </form>
  );
}
