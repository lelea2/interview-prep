import { useEffect } from 'react';
import { useRows } from '@/hooks/useRows';
import { useSummary } from '@/hooks/useSummary';
import { useParseInput } from '@/hooks/useParseInput';
import { useToasts } from '@/hooks/useToasts';
import { InputPanel } from '@/components/InputPanel/InputPanel';
import { SummaryPanel } from '@/components/SummaryPanel/SummaryPanel';
import { TrackerTable } from '@/components/TrackerTable/TrackerTable';
import { ToastStack } from '@/components/shared/Toast';
import styles from './App.module.css';

function App() {
  const {
    rows,
    loading: rowsLoading,
    error: rowsError,
    version,
    newRowIds,
    updateRow,
    addRow,
    deleteRow,
    bulkInsertRows,
  } = useRows();
  const { summary, loading: summaryLoading } = useSummary(version);
  const { submit: submitParse, loading: parseLoading, error: parseError } = useParseInput(bulkInsertRows);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // Row mutations (add/update/delete/bulk insert) already revert their
  // optimistic state on failure — the toast is just how the user finds out.
  // The parse-specific "0 rows extracted" message stays inline in
  // InputPanel instead (see BUILD_PLAN.md Phase 7 scope note).
  useEffect(() => {
    if (rowsError) pushToast(rowsError);
  }, [rowsError, pushToast]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>AI Interview Prep Tracker</h1>
        <p className={styles.subtitle}>Paste messy job-search notes, get a structured tracker.</p>
      </header>

      <main className={styles.main}>
        <InputPanel onSubmit={submitParse} loading={parseLoading} error={parseError} />
        <SummaryPanel summary={summary} loading={summaryLoading} />
        <TrackerTable
          rows={rows}
          loading={rowsLoading}
          onUpdateRow={updateRow}
          onAddRow={() => {
            addRow().catch(() => {});
          }}
          onDeleteRow={deleteRow}
          missingInfo={summary?.missingInfo ?? []}
          newRowIds={newRowIds}
        />
      </main>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
