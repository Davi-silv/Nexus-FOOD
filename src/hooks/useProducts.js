import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createProduct,
  deactivateProduct,
  listProducts,
  reactivateProduct,
  updateProduct,
} from '@/services/products.service.js';

export function useProducts(companyId) {
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
      setItems(listProducts(companyId));
    } catch (err) {
      setError(err.message || 'Não foi possível carregar produtos.');
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
      const row = createProduct(companyId, payload);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const update = useCallback(
    async (id, payload) => {
      const row = updateProduct(companyId, id, payload);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const deactivate = useCallback(
    async (id) => {
      const row = deactivateProduct(companyId, id);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const reactivate = useCallback(
    async (id) => {
      const row = reactivateProduct(companyId, id);
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === 'active');
    return {
      total: active.length,
      available: active.filter((i) => i.available).length,
      unavailable: active.filter((i) => !i.available).length,
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
