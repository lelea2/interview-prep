import { useCallback, useEffect, useState } from 'react';
import type { TrackerSummary } from '@interview-prep/shared';
import * as summaryApi from '@/api/summary';
import { toErrorMessage } from '@/api/client';

// =============================================================================
// useSummary — fetches TrackerSummary from the server; never computes
// metrics client-side. Pass `useRows().version` as `refreshKey` so a
// mutation there triggers a refetch here without the two hooks knowing
// about each other directly.
// =============================================================================

export function useSummary(refreshKey: unknown) {
  const [summary, setSummary] = useState<TrackerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await summaryApi.getSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshKey]);

  return { summary, loading, error };
}
