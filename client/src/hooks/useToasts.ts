import { useCallback, useRef, useState } from 'react';

export interface ToastData {
  id: number;
  message: string;
}

const AUTO_DISMISS_MS = 5000;

// =============================================================================
// useToasts — minimal, dependency-free toast queue. App.tsx pushes a toast
// whenever a hook's error state transitions to non-null (see App.tsx); each
// toast auto-dismisses after AUTO_DISMISS_MS or can be dismissed manually.
// =============================================================================

export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}
