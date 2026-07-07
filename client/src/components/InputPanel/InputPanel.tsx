import { useState } from 'react';
import { Spinner } from '../shared/Spinner';
import styles from './InputPanel.module.css';

// One submit = one row (see server/src/services/parser.ts), so the sample
// covers a single company — pasting notes for another company is a second
// paste + submit, not a second paragraph in the same one.
const SAMPLE_INPUT = `Stripe - Staff Frontend Engineer
Recruiter screen scheduled July 20 with Jane. Prep: React, system design, payments API.
Next: send portfolio link by Friday.`;

interface InputPanelProps {
  onSubmit: (raw: string) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function InputPanel({ onSubmit, loading, error }: InputPanelProps) {
  const [raw, setRaw] = useState('');

  async function handleGenerate() {
    if (!raw.trim() || loading) return;
    await onSubmit(raw).catch(() => {});
    setRaw('');
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
          className={styles.secondaryButton}
          onClick={() => setRaw(SAMPLE_INPUT)}
          disabled={loading}
        >
          Load Sample
        </button>
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
