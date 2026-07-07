import { useMemo, useState } from 'react';
import type {
  FilterState,
  MissingInfoItem,
  SortField,
  SortState,
  TrackerRow as TrackerRowData,
  UpdateRowRequest,
} from '@interview-prep/shared';
import { filterRows, sortRows } from '@/lib/tableUtils';
import { TableRow } from './TableRow';
import { TableToolbar } from './TableToolbar';
import { EmptyState } from '../shared/EmptyState';
import { Spinner } from '../shared/Spinner';
import styles from './TrackerTable.module.css';

interface TrackerTableProps {
  rows: TrackerRowData[];
  loading: boolean;
  onUpdateRow: (id: string, fields: UpdateRowRequest['fields']) => Promise<TrackerRowData>;
  onAddRow: () => void;
  onDeleteRow: (id: string) => Promise<void>;
  missingInfo: MissingInfoItem[];
  newRowIds: Set<string>;
}

interface ColumnDef {
  label: string;
  field?: SortField;
}

const COLUMNS: ColumnDef[] = [
  { label: 'Company', field: 'company' },
  { label: 'Role' },
  { label: 'Stage' },
  { label: 'Interview Date', field: 'interviewDate' },
  { label: 'Status', field: 'status' },
  { label: 'Priority', field: 'priority' },
  { label: 'Prep Topics' },
  { label: 'Next Action' },
  { label: 'Follow-up Owner' },
  { label: '' },
];

const DEFAULT_FILTERS: FilterState = { status: 'All', company: 'All', showDoneActions: true };
const DEFAULT_SORT: SortState = { field: 'interviewDate', direction: 'asc' };
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

export function TrackerTable({
  rows,
  loading,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  missingInfo,
  newRowIds,
}: TrackerTableProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const companies = useMemo(
    () => [...new Set(rows.map((r) => r.company).filter(Boolean))].sort(),
    [rows],
  );

  const hasActiveFilters =
    filters.status !== 'All' || filters.company !== 'All' || !filters.showDoneActions;

  const visibleRows = useMemo(
    () => sortRows(filterRows(rows, filters), sort),
    [rows, filters, sort],
  );

  const missingByRowId = useMemo(
    () => new Map(missingInfo.map((item) => [item.rowId, item.fields])),
    [missingInfo],
  );

  function handleSortClick(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' },
    );
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  // Arrow-key grid navigation between cells (spreadsheet-style), scoped to
  // <tbody> rows. Skipped while a cell is actively being edited (a real
  // text/date <input> or open <select>) so arrow keys move the text cursor
  // or the dropdown selection instead of jumping cells — see BUILD_PLAN.md
  // Phase 8. Known gap: arrow-up from the first data row doesn't reach the
  // header's sort buttons.
  function handleGridKeyDown(e: React.KeyboardEvent<HTMLTableElement>) {
    if (!ARROW_KEYS.has(e.key)) return;

    const target = e.target as HTMLElement;
    if (target.classList.contains(styles.cellInput) || target.tagName === 'SELECT') return;

    const cell = target.closest('td');
    const row = target.closest('tr');
    if (!cell || !row || row.parentElement?.tagName !== 'TBODY') return;

    let nextCell: Element | null | undefined;
    if (e.key === 'ArrowLeft') {
      nextCell = cell.previousElementSibling;
    } else if (e.key === 'ArrowRight') {
      nextCell = cell.nextElementSibling;
    } else {
      const cellIndex = Array.from(row.children).indexOf(cell);
      const targetRow = e.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
      nextCell = targetRow?.children[cellIndex];
    }

    const nextFocusable = nextCell?.querySelector<HTMLElement>('button, input, select');
    if (nextFocusable) {
      e.preventDefault();
      nextFocusable.focus();
    }
  }

  return (
    <section className={styles.section}>
      <TableToolbar
        onAddRow={onAddRow}
        rowCount={visibleRows.length}
        totalCount={rows.length}
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {loading ? (
        <p className={styles.loading}>
          <Spinner /> Loading…
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No opportunities tracked yet"
          description="Paste notes above to get started, or add a row manually."
        />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          title="No rows match"
          description="Try adjusting your filters."
          action={
            <button type="button" className={styles.clearFiltersButton} onClick={handleClearFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table} role="grid" onKeyDown={handleGridKeyDown}>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.label || 'actions'}>
                    {col.field ? (
                      <button
                        type="button"
                        className={styles.sortButton}
                        onClick={() => handleSortClick(col.field!)}
                      >
                        {col.label}
                        {sort.field === col.field && (
                          <span className={styles.sortIndicator}>
                            {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  row={row}
                  onUpdate={onUpdateRow}
                  onDelete={onDeleteRow}
                  missingFields={missingByRowId.get(row.id)}
                  isNew={newRowIds.has(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
