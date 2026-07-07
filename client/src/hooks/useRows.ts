import { useCallback, useEffect, useState } from 'react';
import type { TrackerRow, UpdateRowRequest } from '@interview-prep/shared';
import * as rowsApi from '@/api/rows';
import { toErrorMessage } from '@/api/client';

const NEW_ROW_HIGHLIGHT_MS = 2000;

// =============================================================================
// useRows — single owner of row state. Fetches on mount; every mutation is
// applied optimistically and reconciled with (or reverted from) the server
// response. `version` bumps on every successful mutation so callers (see
// useSummary) can key a refetch off it without useRows knowing about summary.
// `newRowIds` tracks rows added in the last NEW_ROW_HIGHLIGHT_MS so
// TrackerTable can fade in a highlight (see BUILD_PLAN.md Phase 7).
// =============================================================================

export function useRows() {
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());

  const flagAsNew = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setNewRowIds((prev) => new Set([...prev, ...ids]));
    ids.forEach((id) => {
      setTimeout(() => {
        setNewRowIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, NEW_ROW_HIGHLIGHT_MS);
    });
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rowsApi.getRows();
      setRows(data);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const updateRow = useCallback(
    async (id: string, fields: UpdateRowRequest['fields']) => {
      const previous = rows;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
      try {
        const updated = await rowsApi.updateRow(id, fields);
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setVersion((v) => v + 1);
        return updated;
      } catch (err) {
        setRows(previous);
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [rows],
  );

  const addRow = useCallback(
    async (opportunityId?: string) => {
      try {
        const row = await rowsApi.addRow(opportunityId);
        setRows((prev) => [...prev, row]);
        setVersion((v) => v + 1);
        flagAsNew([row.id]);
        return row;
      } catch (err) {
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [flagAsNew],
  );

  const deleteRow = useCallback(
    async (id: string) => {
      const previous = rows;
      setRows((prev) => prev.filter((r) => r.id !== id));
      try {
        await rowsApi.deleteRow(id);
        setVersion((v) => v + 1);
      } catch (err) {
        setRows(previous);
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [rows],
  );

  const bulkInsertRows = useCallback(
    async (newRows: TrackerRow[]) => {
      try {
        const { rows: saved } = await rowsApi.bulkInsertRows(newRows);
        setRows((prev) => [...prev, ...saved]);
        setVersion((v) => v + 1);
        flagAsNew(saved.map((r) => r.id));
        return saved;
      } catch (err) {
        setError(toErrorMessage(err));
        throw err;
      }
    },
    [flagAsNew],
  );

  return {
    rows,
    loading,
    error,
    version,
    newRowIds,
    refetch: fetchRows,
    updateRow,
    addRow,
    deleteRow,
    bulkInsertRows,
  };
}
