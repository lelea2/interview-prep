import type { ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  label: string;
  children: ReactNode;
}

// CSS-only tooltip (hover + focus-within) — no positioning library needed
// for a single fixed "above the trigger" placement.
export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className={styles.wrapper}>
      <span className={styles.trigger} tabIndex={0}>
        {children}
      </span>
      <span className={styles.bubble} role="tooltip">
        {label}
      </span>
    </span>
  );
}
