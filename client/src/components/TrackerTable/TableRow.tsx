import { INTERVIEW_STATUSES, PRIORITIES } from '@interview-prep/shared';
import type { InterviewStatus, Priority, TrackerRow as TrackerRowData, UpdateRowRequest } from '@interview-prep/shared';
import { TableCell } from './TableCell';
import { Badge } from '../shared/Badge';
import { Tooltip } from '../shared/Tooltip';
import styles from './TrackerTable.module.css';

interface TableRowProps {
  row: TrackerRowData;
  onUpdate: (id: string, fields: UpdateRowRequest['fields']) => Promise<TrackerRowData>;
  onDelete: (id: string) => Promise<void>;
  missingFields?: string[];
  isNew?: boolean;
}

export function TableRow({ row, onUpdate, onDelete, missingFields, isNew }: TableRowProps) {
  // Mutations are already reconciled (optimistic update + revert-on-error +
  // error toast) inside useRows — swallow here so a rejected PATCH doesn't
  // also surface as an unhandled promise rejection in the console.
  function handleUpdate(fields: UpdateRowRequest['fields']) {
    onUpdate(row.id, fields).catch(() => {});
  }

  function handleDelete() {
    onDelete(row.id).catch(() => {});
  }

  return (
    <tr className={isNew ? `${styles.row} ${styles.rowNew}` : styles.row}>
      <td>
        <div className={styles.companyCell}>
          {missingFields && missingFields.length > 0 && (
            <Tooltip label={`Missing: ${missingFields.join(', ')}`}>
              <span className={styles.warningIcon} aria-label={`Missing info: ${missingFields.join(', ')}`}>
                ⚠
              </span>
            </Tooltip>
          )}
          <TableCell value={row.company} type="text" onCommit={(v) => handleUpdate({ company: v })} />
        </div>
      </td>
      <td>
        <TableCell value={row.role} type="text" onCommit={(v) => handleUpdate({ role: v })} />
      </td>
      <td>
        <TableCell value={row.stage} type="text" onCommit={(v) => handleUpdate({ stage: v })} />
      </td>
      <td>
        <TableCell
          value={row.interviewDate ?? ''}
          type="date"
          onCommit={(v) => handleUpdate({ interviewDate: v || null })}
        />
      </td>
      <td>
        <TableCell
          value={row.status}
          type="select"
          options={INTERVIEW_STATUSES}
          onCommit={(v) => handleUpdate({ status: v as InterviewStatus })}
          renderDisplay={(v) => <Badge label={v} tone="status" />}
        />
      </td>
      <td>
        <TableCell
          value={row.priority}
          type="select"
          options={PRIORITIES}
          onCommit={(v) => handleUpdate({ priority: v as Priority })}
          renderDisplay={(v) => <Badge label={v} tone="priority" />}
        />
      </td>
      <td>
        <TableCell
          value={row.prepTopics.join(', ')}
          type="text"
          onCommit={(v) => handleUpdate({ prepTopics: splitTags(v) })}
        />
      </td>
      <td className={styles.nextActionCell}>
        <input
          type="checkbox"
          checked={row.nextActionDone}
          onChange={(e) => handleUpdate({ nextActionDone: e.target.checked })}
          aria-label={`Mark "${row.nextAction || 'next action'}" done`}
        />
        <TableCell value={row.nextAction} type="text" onCommit={(v) => handleUpdate({ nextAction: v })} />
      </td>
      <td>
        <TableCell value={row.followUpOwner} type="text" onCommit={(v) => handleUpdate({ followUpOwner: v })} />
      </td>
      <td>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDelete}
          aria-label={`Delete ${row.company || 'row'}`}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
