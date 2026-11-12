import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  CreateEventDialogContext,
  loadCreateEventDialog,
  type OpenCreateEventOptions,
} from './createEventDialogContext';

const CreateEventDialog = lazy(loadCreateEventDialog);

type Session = { id: number; options: OpenCreateEventOptions };

export default function CreateEventDialogProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);

  const open = useCallback((options: OpenCreateEventOptions = {}) => {
    setSession((current) => ({ id: (current?.id ?? 0) + 1, options }));
  }, []);

  const dismiss = useCallback(() => setSession(null), []);

  const controls = useMemo(() => ({ open, dismiss }), [open, dismiss]);

  const close = () => {
    const onClosed = session?.options.onClosed;
    setSession(null);
    onClosed?.();
  };

  return (
    <CreateEventDialogContext.Provider value={controls}>
      {children}
      {session ? (
        <Suspense fallback={null}>
          <CreateEventDialog
            key={session.id}
            open
            onClose={close}
            reuse={session.options.reuse ?? null}
          />
        </Suspense>
      ) : null}
    </CreateEventDialogContext.Provider>
  );
}
