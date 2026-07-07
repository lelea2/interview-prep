import { useCallback, useState } from 'react';
import type { TrackerRow } from '@interview-prep/shared';
import * as parseApi from '@/api/parse';
import { toErrorMessage } from '@/api/client';

const NO_ROWS_MESSAGE =
  "Couldn't extract opportunities — try including company names, roles, or dates";

// =============================================================================
// useParseInput — POSTs raw text to /api/parse, then hands the resulting
// rows to the caller's `bulkInsertRows` (from useRows) to persist. Decoupled
// from useRows itself so InputPanel doesn't need to know how rows are stored.
// =============================================================================

export function useParseInput(bulkInsertRows: (rows: TrackerRow[]) => Promise<TrackerRow[]>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (raw: string) => {
      setLoading(true);
      setError(null);
      try {
        const { rows } = await parseApi.postParseInput(raw);
        if (rows.length === 0) {
          setError(NO_ROWS_MESSAGE);
          return [];
        }
        return await bulkInsertRows(rows);
      } catch (err) {
        setError(toErrorMessage(err));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [bulkInsertRows],
  );

  return { submit, loading, error };
}
