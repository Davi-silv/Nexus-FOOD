import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInventoryMovement,
  getInventoryStats,
  listInventoryMovements,
  listStockPositions,
} from '@/services/inventory.service.js';

export function useInventory(companyId) {
  const [positions, setPositions] = useState([]);
  const [movements, setMovements] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    stockValue: 0,
    critical: 0,
    low: 0,
    movementsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!companyId) {
      setPositions([]);
      setMovements([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setPositions(listStockPositions(companyId));
      setMovements(listInventoryMovements(companyId, { limit: 40 }));
      setStats(getInventoryStats(companyId));
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o estoque.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const registerMovement = useCallback(
    async (payload) => {
      const mov = createInventoryMovement(companyId, payload);
      refresh();
      return mov;
    },
    [companyId, refresh],
  );

  const criticalItems = useMemo(
    () => positions.filter((p) => p.level === 'critical' || p.level === 'low'),
    [positions],
  );

  return {
    positions,
    movements,
    stats,
    criticalItems,
    loading,
    error,
    refresh,
    registerMovement,
  };
}
