import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteRecipe,
  listRecipeCostHistory,
  listRecipes,
  saveRecipe,
} from '@/services/recipes.service.js';

export function useRecipes(companyId) {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!companyId) {
      setItems([]);
      setHistory([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setItems(listRecipes(companyId));
      setHistory(listRecipeCostHistory(companyId, { limit: 30 }));
    } catch (err) {
      setError(err.message || 'Não foi possível carregar fichas técnicas.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (payload, recipeId = null) => {
      const row = saveRecipe(companyId, payload, { recipeId });
      refresh();
      return row;
    },
    [companyId, refresh],
  );

  const remove = useCallback(
    async (id) => {
      deleteRecipe(companyId, id);
      refresh();
    },
    [companyId, refresh],
  );

  const stats = useMemo(() => {
    if (!items.length) {
      return { total: 0, avgMargin: 0, avgCmv: 0, topMargin: null };
    }
    const avgMargin = items.reduce((s, r) => s + (r.marginPercent || 0), 0) / items.length;
    const avgCmv = items.reduce((s, r) => s + (r.cmvPercent || 0), 0) / items.length;
    const topMargin = [...items].sort((a, b) => b.marginPercent - a.marginPercent)[0];
    return {
      total: items.length,
      avgMargin,
      avgCmv,
      topMargin,
    };
  }, [items]);

  return {
    items,
    history,
    loading,
    error,
    stats,
    refresh,
    save,
    remove,
  };
}
