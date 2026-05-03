import { useEffect, useState, useCallback } from 'react';
import { listTickets } from '../services/api';

export function useTickets(filters = {}) {
  const [data, setData] = useState({ items: [], count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listTickets(filters);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  return { ...data, isLoading, error, reload: load };
}
