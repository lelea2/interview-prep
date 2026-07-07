import styles from './Spinner.module.css';

// Small inline spinner — used in button/loading-row states, never a
// full-page skeleton (see BUILD_PLAN.md Phase 7).
export function Spinner() {
  return <span className={styles.spinner} role="presentation" />;
}
