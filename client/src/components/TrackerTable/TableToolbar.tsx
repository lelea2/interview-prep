import { INTERVIEW_STATUSES } from '@interview-prep/shared';
import type { FilterState, InterviewStatus } from '@interview-prep/shared';
import styles from './TrackerTable.module.css';

interface TableToolbarProps {
  onAddRow: () => void;
  rowCount: number;
  totalCount: number;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  companies: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function TableToolbar({
  onAddRow,
  rowCount,
  totalCount,
  filters,
  onFiltersChange,
  companies,
  hasActiveFilters,
  onClearFilters,
}: TableToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={filters.status}
          onChange={(e) =>
            onFiltersChange({ ...filters, status: e.target.value as InterviewStatus | 'All' })
          }
          aria-label="Filter by status"
        >
          <option value="All">All statuses</option>
          {INTERVIEW_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filters.company}
          onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
          aria-label="Filter by company"
        >
          <option value="All">All companies</option>
          {companies.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!filters.showDoneActions}
            onChange={(e) => onFiltersChange({ ...filters, showDoneActions: !e.target.checked })}
          />
          Hide completed actions
        </label>

        {hasActiveFilters && (
          <button type="button" className={styles.clearFiltersButton} onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.toolbarRight}>
        <span className={styles.rowCount}>
          {hasActiveFilters ? `${rowCount} of ${totalCount}` : totalCount}{' '}
          {totalCount === 1 ? 'row' : 'rows'}
        </span>
        <button type="button" className={styles.addRowButton} onClick={onAddRow}>
          + Add Row
        </button>
      </div>
    </div>
  );
}
