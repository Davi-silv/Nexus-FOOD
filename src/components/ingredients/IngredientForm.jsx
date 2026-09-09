import { useEffect, useState } from 'react';
import { INGREDIENT_CATEGORIES, UNITS } from '@/core/constants.js';
import { Button } from '@/components/ui/Button.jsx';

const EMPTY = {
  name: '',
  category: '',
  unit: 'kg',
  quantity: '0',
  minStock: '0',
  currentCost: '0',
  supplierName: '',
  lastPurchaseAt: '',
  status: 'active',
};

function toFormValues(ingredient) {
  if (!ingredient) return { ...EMPTY };
  return {
    name: ingredient.name || '',
    category: ingredient.category || '',
    unit: ingredient.unit || 'kg',
    quantity: String(ingredient.quantity ?? 0),
    minStock: String(ingredient.minStock ?? 0),
    currentCost: String(ingredient.currentCost ?? 0),
    supplierName: ingredient.supplierName || '',
    lastPurchaseAt: ingredient.lastPurchaseAt || '',
    status: ingredient.status || 'active',
  };
}

export function IngredientForm({ initial, fieldErrors = {}, onSubmit, onCancel, loading }) {
  const [values, setValues] = useState(() => toFormValues(initial));

  useEffect(() => {
    setValues(toFormValues(initial));
  }, [initial]);

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...values,
      quantity: Number(values.quantity),
      minStock: Number(values.minStock),
      currentCost: Number(values.currentCost),
      lastPurchaseAt: values.lastPurchaseAt || null,
    });
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <label className="form-field span-2">
        <span>Nome *</span>
        <input
          className="input"
          value={values.name}
          onChange={(e) => setField('name', e.target.value)}
          autoFocus
          required
        />
        {fieldErrors.name ? <em className="field-error">{fieldErrors.name}</em> : null}
      </label>

      <label className="form-field">
        <span>Categoria</span>
        <input
          className="input"
          list="ingredient-categories"
          value={values.category}
          onChange={(e) => setField('category', e.target.value)}
          placeholder="Ex.: Proteínas"
        />
        <datalist id="ingredient-categories">
          {INGREDIENT_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {fieldErrors.category ? <em className="field-error">{fieldErrors.category}</em> : null}
      </label>

      <label className="form-field">
        <span>Unidade *</span>
        <select
          className="input"
          value={values.unit}
          onChange={(e) => setField('unit', e.target.value)}
        >
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
        {fieldErrors.unit ? <em className="field-error">{fieldErrors.unit}</em> : null}
      </label>

      <label className="form-field">
        <span>{initial ? 'Quantidade atual' : 'Quantidade inicial *'}</span>
        <input
          className="input"
          type="number"
          min="0"
          step="any"
          value={values.quantity}
          onChange={(e) => setField('quantity', e.target.value)}
          disabled={Boolean(initial)}
          title={initial ? 'Altere a quantidade em Estoque → Movimentação' : undefined}
        />
        {initial ? (
          <em className="field-hint">Alterações de saldo apenas via Estoque (movimentação).</em>
        ) : null}
        {fieldErrors.quantity ? <em className="field-error">{fieldErrors.quantity}</em> : null}
      </label>

      <label className="form-field">
        <span>Estoque mínimo *</span>
        <input
          className="input"
          type="number"
          min="0"
          step="any"
          value={values.minStock}
          onChange={(e) => setField('minStock', e.target.value)}
        />
        {fieldErrors.minStock ? <em className="field-error">{fieldErrors.minStock}</em> : null}
      </label>

      <label className="form-field">
        <span>Custo atual (R$) *</span>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={values.currentCost}
          onChange={(e) => setField('currentCost', e.target.value)}
        />
        {fieldErrors.currentCost ? <em className="field-error">{fieldErrors.currentCost}</em> : null}
      </label>

      <label className="form-field">
        <span>Fornecedor principal</span>
        <input
          className="input"
          value={values.supplierName}
          onChange={(e) => setField('supplierName', e.target.value)}
          placeholder="Opcional"
        />
      </label>

      <label className="form-field">
        <span>Data da última compra</span>
        <input
          className="input"
          type="date"
          value={values.lastPurchaseAt || ''}
          onChange={(e) => setField('lastPurchaseAt', e.target.value)}
        />
        {fieldErrors.lastPurchaseAt ? (
          <em className="field-error">{fieldErrors.lastPurchaseAt}</em>
        ) : null}
      </label>

      <label className="form-field">
        <span>Status</span>
        <select
          className="input"
          value={values.status}
          onChange={(e) => setField('status', e.target.value)}
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </label>

      <div className="form-actions span-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
