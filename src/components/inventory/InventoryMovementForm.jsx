import { useEffect, useMemo, useState } from 'react';
import { INVENTORY_MOVEMENT_TYPES } from '@/core/constants.js';
import { Button } from '@/components/ui/Button.jsx';
import { formatMoney, formatNumber } from '@/core/utils/money.js';

export function InventoryMovementForm({
  ingredients,
  initialIngredientId = '',
  fieldErrors = {},
  onSubmit,
  onCancel,
  loading,
}) {
  const [ingredientId, setIngredientId] = useState(initialIngredientId);
  const [type, setType] = useState('entrada');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setIngredientId(initialIngredientId || '');
  }, [initialIngredientId]);

  const selected = useMemo(
    () => ingredients.find((i) => i.id === ingredientId),
    [ingredients, ingredientId],
  );

  const typeMeta = INVENTORY_MOVEMENT_TYPES.find((t) => t.value === type);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ingredientId,
      type,
      quantity: Number(quantity),
      unit: selected?.unit,
      notes: notes || null,
    });
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <label className="form-field span-2">
        <span>Ingrediente *</span>
        <select
          className="input"
          value={ingredientId}
          onChange={(e) => setIngredientId(e.target.value)}
          required
        >
          <option value="">Selecione…</option>
          {ingredients.map((ing) => (
            <option key={ing.id} value={ing.id}>
              {ing.name} — atual {formatNumber(ing.quantity)} {ing.unit}
            </option>
          ))}
        </select>
        {fieldErrors.ingredientId ? (
          <em className="field-error">{fieldErrors.ingredientId}</em>
        ) : null}
      </label>

      <label className="form-field">
        <span>Tipo *</span>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {INVENTORY_MOVEMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {fieldErrors.type ? <em className="field-error">{fieldErrors.type}</em> : null}
      </label>

      <label className="form-field">
        <span>
          {type === 'ajuste' ? 'Novo saldo *' : 'Quantidade *'}
          {selected ? ` (${selected.unit})` : ''}
        </span>
        <input
          className="input"
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        {fieldErrors.quantity ? <em className="field-error">{fieldErrors.quantity}</em> : null}
      </label>

      <label className="form-field span-2">
        <span>Observação</span>
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
        />
      </label>

      {selected ? (
        <p className="muted span-2">
          Estoque atual: <strong>{formatNumber(selected.quantity)} {selected.unit}</strong>
          {' · '}
          Valor: <strong>{formatMoney(selected.quantity * selected.currentCost)}</strong>
          {typeMeta?.direction === 'set'
            ? ' · Ajuste define o saldo final.'
            : typeMeta?.direction === 'out'
              ? ' · Saída/perda/consumo reduz o estoque.'
              : ' · Entrada/compra aumenta o estoque.'}
        </p>
      ) : null}

      <div className="form-actions span-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Registrar movimentação
        </Button>
      </div>
    </form>
  );
}
