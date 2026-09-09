import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createIngredient,
  deactivateIngredient,
  listIngredients,
  reactivateIngredient,
  updateIngredient,
} from '@/services/ingredients.service.js';
import { getStockLevel } from '@/validations/ingredient.validation.js';

/**
 * Hook de ingredientes escopado por companyId.
 */
export function useIngredients(companyId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!companyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const rows = listIngredients(companyId).map((row) => ({
        ...row,
        level: getStockLevel(row.quantity, row.minStock),
      }));
      setItems(rows);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar ingredientes.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (payload) => {
      const row = createIngredient(companyId, payload);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const update = useCallback(
    async (id, payload) => {
      const row = updateIngredient(companyId, id, payload);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const deactivate = useCallback(
    async (id) => {
      const row = deactivateIngredient(companyId, id);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const reactivate = useCallback(
    async (id) => {
      const row = reactivateIngredient(companyId, id);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === 'active');
    return {
      total: active.length,
      critical: active.filter((i) => i.level === 'critical').length,
      low: active.filter((i) => i.level === 'low').length,
    };
  }, [items]);

  return {
    items,
    loading,
    error,
    stats,
    refresh,
    create,
    update,
    deactivate,
    reactivate,
  };
}
