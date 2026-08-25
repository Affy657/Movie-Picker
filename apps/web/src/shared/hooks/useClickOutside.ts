import { useEffect, useRef } from 'react';

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean,
  ignoreSelector?: string
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (!(target instanceof Element)) return;
      if (ignoreSelector && target.closest(ignoreSelector)) return;
      // Un dialogue natif ouvert (ConfirmDialog, etc.) capture deja
      // l'interaction : un clic dedans ne doit jamais fermer un panneau
      // sous-jacent, meme si ce dialogue est rendu hors de `ref`.
      if (target.closest('dialog[open]')) return;
      onCloseRef.current();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [enabled, ref, ignoreSelector]);
}
