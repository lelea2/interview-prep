import styles from './Badge.module.css';

interface BadgeProps {
  label: string;
  tone: 'status' | 'priority';
}

export function Badge({ label, tone }: BadgeProps) {
  return (
    <span className={styles.badge} data-tone={tone} data-value={label}>
      {label}
    </span>
  );
}
