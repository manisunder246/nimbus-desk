import { useEffect, useState } from 'react';
import { listUsers } from '../services/api';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((r) => { if (!cancelled) setUsers(r.items || []); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { users, isLoading, error };
}
