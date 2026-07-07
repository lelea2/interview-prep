import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './TrackerTable.module.css';

type CellType = 'text' | 'select' | 'date';

interface TableCellProps {
  value: string;
  type: CellType;
  options?: readonly string[];
  onCommit: (value: string) => void;
  renderDisplay?: (value: string) => ReactNode;
  placeholder?: string;
}

// =============================================================================
// TableCell — click-to-edit cell shared by every editable column.
//
// Behavior: click (or Enter/Space while focused) enters edit mode. Blur or
// Enter commits (calls onCommit only if the value actually changed). Escape
// reverts without calling the server. Tab relies on the browser's default
// focus movement — blur fires first and commits, then focus lands on the
// next cell's static button. It does not auto-enter edit mode on the next
// cell; that's a deliberate scope cut (see BUILD_PLAN.md Phase 5).
// =============================================================================

export function TableCell({
  value,
  type,
  options,
  onCommit,
  renderDisplay,
  placeholder = '—',
}: TableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    (type === 'select' ? selectRef.current : textRef.current)?.focus();
  }, [editing, type]);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function commit(next: string) {
    setEditing(false);
    if (next !== value) onCommit(next);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button type="button" className={styles.cellStatic} onClick={startEditing}>
        {value ? (
          (renderDisplay?.(value) ?? value)
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
      </button>
    );
  }

  if (type === 'select') {
    return (
      <select
        ref={selectRef}
        className={styles.cellInput}
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onBlur={cancel}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
        }}
      >
        {options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={textRef}
      className={styles.cellInput}
      type={type === 'date' ? 'date' : 'text'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(draft);
        }
        if (e.key === 'Escape') cancel();
      }}
    />
  );
}
