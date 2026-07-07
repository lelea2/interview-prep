import type { TrackerSummary } from '@interview-prep/shared';
import { Spinner } from '../shared/Spinner';
import styles from './SummaryPanel.module.css';

interface SummaryPanelProps {
  summary: TrackerSummary | null;
  loading: boolean;
}

const MAX_UPCOMING_SHOWN = 4;
const MAX_TOPICS_SHOWN = 6;

export function SummaryPanel({ summary, loading }: SummaryPanelProps) {
  if (loading && !summary) {
    return (
      <section className={styles.panel}>
        <p className={styles.loading}>
          <Spinner /> Loading summary…
        </p>
      </section>
    );
  }

  if (!summary) return null;

  return (
    <section className={styles.panel} aria-label="Tracker summary">
      <div className={styles.card}>
        <span className={styles.cardValue}>{summary.totalActive}</span>
        <span className={styles.cardLabel}>Active Opportunities</span>
      </div>

      <div className={styles.card}>
        <span className={styles.cardValue}>{summary.upcomingInterviews.length}</span>
        <span className={styles.cardLabel}>Upcoming Interviews (7d)</span>
        {summary.upcomingInterviews.length > 0 && (
          <ul className={styles.cardList}>
            {summary.upcomingInterviews.slice(0, MAX_UPCOMING_SHOWN).map((row) => (
              <li key={row.id}>
                {row.company} — {row.interviewDate}
              </li>
            ))}
            {summary.upcomingInterviews.length > MAX_UPCOMING_SHOWN && (
              <li className={styles.cardListMore}>
                +{summary.upcomingInterviews.length - MAX_UPCOMING_SHOWN} more
              </li>
            )}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardValue}>{summary.followUpsDue.length}</span>
        <span className={styles.cardLabel}>Follow-ups Due</span>
      </div>

      <div className={styles.card}>
        <span className={styles.cardValue}>{summary.highPriorityPrep.length}</span>
        <span className={styles.cardLabel}>High-Priority Prep Topics</span>
        {summary.highPriorityPrep.length > 0 && (
          <div className={styles.chipRow}>
            {summary.highPriorityPrep.slice(0, MAX_TOPICS_SHOWN).map((topic) => (
              <span key={topic} className={styles.chip}>
                {topic}
              </span>
            ))}
            {summary.highPriorityPrep.length > MAX_TOPICS_SHOWN && (
              <span className={styles.chip}>
                +{summary.highPriorityPrep.length - MAX_TOPICS_SHOWN}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.cardValue}>{summary.missingInfo.length}</span>
        <span className={styles.cardLabel}>Rows Missing Info</span>
        {summary.missingInfo.length > 0 && (
          <span className={styles.cardHint}>See ⚠ in the table below</span>
        )}
      </div>
    </section>
  );
}
