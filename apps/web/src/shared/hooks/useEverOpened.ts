import { useState } from 'react';

export function useEverOpened(open: boolean): boolean {
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);
  return open || everOpened;
}
