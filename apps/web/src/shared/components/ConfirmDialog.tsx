import { useEffect, useId, useRef } from 'react';
import { useTranslation } from '@/shared/i18n';
import styles from './ConfirmDialog.module.css';

type ConfirmDialogProps = {
  /** Quand `true`, ouvre la modale (en `showModal()`, focus trap + scrim natifs). */
  open: boolean;
  /** Texte du titre (libellé court) — projeté dans `aria-labelledby`. */
  title: string;
  /** Message d'explication (peut inclure le pseudo, etc.). */
  message: string;
  /** Libellé du bouton de confirmation. Défaut : `common.confirm`. */
  confirmLabel?: string;
  /** Libellé du bouton d'annulation. Défaut : `common.cancel`. */
  cancelLabel?: string;
  /**
   * Variante visuelle du bouton de confirmation.
   * - `danger` (défaut) : action destructive (rouge).
   * - `primary` : action neutre/positive.
   */
  confirmVariant?: 'danger' | 'primary';
  /**
   * Mutation en cours : désactive le bouton de confirmation pour empêcher un
   * double envoi. Le bouton « Annuler » reste actif (l'utilisateur peut
   * fermer la modale ; la mutation déjà déclenchée se résout en arrière-plan
   * et n'affecte pas l'intégrité côté serveur).
   */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Identifiant `data-testid` racine + préfixe pour les boutons (`-confirm`,
   * `-cancel`). Permet de différencier plusieurs ConfirmDialog montés
   * simultanément (ex. retirer participant + supprimer soirée).
   * Défaut : `confirm-dialog`.
   */
  testId?: string;
};

/**
 * Modale de confirmation accessible bâtie sur l'élément natif `<dialog>` :
 * - Focus trap, gestion `Escape` et scrim sont fournis par le navigateur.
 * - Fermeture sur `Escape` → `onCancel` (cohérent avec le bouton « Annuler »).
 *
 * Préférée à `window.confirm()` côté UX (style cohérent, libellés i18n, état busy).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  testId = 'confirm-dialog',
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Identifiants uniques par instance — indispensable quand plusieurs ConfirmDialog
  // sont montés simultanément (sinon `aria-labelledby` / `aria-describedby` cassés).
  const reactId = useId();
  const titleId = `confirm-dialog-title-${reactId}`;
  const messageId = `confirm-dialog-message-${reactId}`;

  // Référence stable pour le handler de fermeture native (Escape, scrim) afin
  // d'éviter de réabonner l'écouteur à chaque render (les parents passent
  // souvent des callbacks recréés à chaque render).
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    if (open && !dlg.open) {
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  // Synchronise la fermeture native (touche Escape) vers le parent. On ne
  // s'abonne qu'à `open` ; le handler lit `onCancelRef.current` pour rester
  // toujours à jour sans réabonnements.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      if (open) onCancelRef.current();
    };
    dlg.addEventListener('close', handleClose);
    return () => dlg.removeEventListener('close', handleClose);
  }, [open]);

  const confirmText = confirmLabel ?? t('common.confirm');
  const cancelText = cancelLabel ?? t('common.cancel');

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      data-testid={testId}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onCancel}
          data-testid={`${testId}-cancel`}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
          data-testid={`${testId}-confirm`}
          autoFocus
        >
          {confirmText}
        </button>
      </div>
    </dialog>
  );
}
