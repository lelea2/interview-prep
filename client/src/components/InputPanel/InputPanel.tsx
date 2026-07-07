import { useState } from 'react';
import { Spinner } from '../shared/Spinner';
import styles from './InputPanel.module.css';

interface InputPanelProps {
  onSubmit: (raw: string) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function InputPanel({ onSubmit, loading, error }: InputPanelProps) {
  const [raw, setRaw] = useState('');

  async function handleGenerate() {
    if (!raw.trim() || loading) return;
    try {
      await onSubmit(raw);
      setRaw('');
    } catch {
      // Failure is already surfaced via the `error` prop — keep the user's
      // text in place instead of silently discarding it.
    }
  }

  return (
    <section className={styles.panel}>
      <label htmlFor="notes-input" className={styles.label}>
        Paste interview notes
      </label>
      <textarea
        id="notes-input"
        className={styles.textarea}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste messy notes about companies, roles, interview stages, dates, prep topics..."
        rows={6}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleGenerate}
          disabled={loading || !raw.trim()}
        >
          {loading ? (
            <span className={styles.loadingContent}>
              <Spinner /> Generating…
            </span>
          ) : (
            'Generate Tracker'
          )}
        </button>
      </div>
    </section>
  );
}
