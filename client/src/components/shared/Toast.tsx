import type { ToastData } from '@/hooks/useToasts';
import styles from './Toast.module.css';

interface ToastStackProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
