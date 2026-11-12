/**
 * Notices, through strata-react (issue #72): the store's queue (`addToast`) stays the one way the
 * app reports, and this component sends each notice to the right weight.
 *
 * - Success, info and warning go to strata's `toast`: they confirm finished work and leave by
 *   themselves, timed to their words, paused under the pointer, in the `StrataToastRegion` that
 *   main.tsx renders once.
 * - Errors stay here as inline `Alert`s, announced, until dismissed. strata's toast has no danger
 *   tone on purpose: a failure a person must act on should not leave by itself.
 *
 * Gap: most errors here are files that would not load. They belong beside the file, with a retry,
 * in strata-react's file intake (`useFileIntake`, `FileOutcomes`, issue #75), which is merged but
 * not in the 1.0.6 release; until it is, they show here.
 */
import React, { useEffect } from 'react';
import { Alert, Button, toast } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';

export const ToastContainer: React.FC = () => {
  const toasts = useProjectStore((state) => state.toasts);
  const removeToast = useProjectStore((state) => state.removeToast);

  useEffect(() => {
    for (const t of toasts) {
      if (t.type === 'error') continue;
      toast.show({ title: t.message, tone: t.type });
      removeToast(t.id);
    }
  }, [toasts, removeToast]);

  const errors = toasts.filter((t) => t.type === 'error');
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 layer-overlay flex w-96 flex-col gap-2">
      {errors.map((t) => (
        <Alert
          key={t.id}
          tone="danger"
          announce
          className="bg-card shadow-overlay"
          action={<Button size="sm" onClick={() => removeToast(t.id)}>Dismiss</Button>}
        >
          {t.message}
        </Alert>
      ))}
    </div>
  );
};
