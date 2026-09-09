import { useEffect, useState } from 'react';
import { PRODUCT_CATEGORIES } from '@/core/constants.js';
import { Button } from '@/components/ui/Button.jsx';

const EMPTY = {
  name: '',
  category: 'Hambúrguer',
  description: '',
  salePrice: '0',
  imageUrl: '',
  available: true,
  status: 'active',
};

function toFormValues(product) {
  if (!product) return { ...EMPTY };
  return {
    name: product.name || '',
    category: product.category || 'Hambúrguer',
    description: product.description || '',
    salePrice: String(product.salePrice ?? 0),
    imageUrl: product.imageUrl || '',
    available: product.available !== false,
    status: product.status || 'active',
  };
}

export function ProductForm({ initial, fieldErrors = {}, onSubmit, onCancel, loading }) {
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
      salePrice: Number(values.salePrice),
      imageUrl: values.imageUrl || null,
      description: values.description || null,
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
        <span>Categoria *</span>
        <input
          className="input"
          list="product-categories"
          value={values.category}
          onChange={(e) => setField('category', e.target.value)}
          placeholder="Ex.: Hambúrguer"
        />
        <datalist id="product-categories">
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {fieldErrors.category ? <em className="field-error">{fieldErrors.category}</em> : null}
      </label>

      <label className="form-field">
        <span>Preço de venda (R$) *</span>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={values.salePrice}
          onChange={(e) => setField('salePrice', e.target.value)}
        />
        {fieldErrors.salePrice ? <em className="field-error">{fieldErrors.salePrice}</em> : null}
      </label>

      <label className="form-field span-2">
        <span>Descrição</span>
        <textarea
          className="input input--area"
          rows={3}
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Opcional"
        />
        {fieldErrors.description ? (
          <em className="field-error">{fieldErrors.description}</em>
        ) : null}
      </label>

      <label className="form-field span-2">
        <span>URL da imagem</span>
        <input
          className="input"
          type="url"
          value={values.imageUrl}
          onChange={(e) => setField('imageUrl', e.target.value)}
          placeholder="https://…"
        />
        {fieldErrors.imageUrl ? <em className="field-error">{fieldErrors.imageUrl}</em> : null}
        {values.imageUrl ? (
          <div className="image-preview">
            <img
              src={values.imageUrl}
              alt="Pré-visualização"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : null}
      </label>

      <label className="form-field form-field--check">
        <input
          type="checkbox"
          checked={values.available}
          onChange={(e) => setField('available', e.target.checked)}
        />
        <span>Disponível para venda</span>
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
