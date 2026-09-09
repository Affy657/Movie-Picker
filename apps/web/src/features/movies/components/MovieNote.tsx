import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Quote, X } from 'lucide-react';
import clsx from 'clsx';
import type { Translate } from '@/features/movies/types';
import { deleteMoviePitchNote, setMoviePitchNote } from '@/features/movies/api/moviesApi';
import styles from './MovieNote.module.css';

export const PITCH_MAX = 140;
const NOTE_PREVIEW_THRESHOLD = 38;

interface MovieNoteProps {
  movieId: string;
  slug: string;
  pitchNote?: string | null;
  isMine: boolean;
  participantId: string | null;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  refresh: () => void;
  onActionError: (message: string) => void;
  t: Translate;
}

export function MovieNote({
  movieId,
  slug,
  pitchNote,
  isMine,
  participantId,
  editing,
  onEditingChange,
  refresh,
  onActionError,
  t,
}: Readonly<MovieNoteProps>) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(pitchNote ?? '');
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleSave = async () => {
    if (!participantId || pending) return;
    const trimmed = draft.trim();
    if (trimmed.length > PITCH_MAX) return;
    if (!trimmed && pitchNote == null) {
      onEditingChange(false);
      return;
    }
    setPending(true);
    try {
      if (trimmed) {
        await setMoviePitchNote(slug, movieId, participantId, trimmed);
      } else {
        await deleteMoviePitchNote(slug, movieId, participantId);
      }
      onEditingChange(false);
      refresh();
    } catch {
      onActionError(t('movies.pitchNote.saveError'));
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleSave();
    if (e.key === 'Escape') onEditingChange(false);
  };

  if (editing) {
    const over = draft.trim().length > PITCH_MAX;
    return (
      <div className={styles.noteEditor}>
        <textarea
          ref={textareaRef}
          className={styles.noteTextarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={t('movies.pitchNote.placeholder')}
          disabled={pending}
        />
        <div className={styles.noteEditorFooter}>
          <span className={clsx(styles.noteCharCount, over && styles.noteCharCountOver)}>
            {t('movies.pitchNote.charCount', { count: draft.trim().length })}
          </span>
          <div className={styles.noteEditorActions}>
            <button
              type="button"
              className={clsx(styles.noteBtn, styles.noteBtnGhost)}
              onClick={() => onEditingChange(false)}
              disabled={pending}
            >
              <X aria-hidden size={13} />
              <span className={styles.noteBtnLabel}>{t('movies.pitchNote.cancelButton')}</span>
            </button>
            <button
              type="button"
              className={clsx(styles.noteBtn, styles.noteBtnPrimary)}
              onClick={() => void handleSave()}
              disabled={pending || over}
            >
              <Check aria-hidden size={13} />
              <span className={styles.noteBtnLabel}>{t('movies.pitchNote.saveButton')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pitchNote) return null;

  const textNode = (
    <span className={clsx(styles.noteText, !expanded && styles.noteTextClamp)}>{pitchNote}</span>
  );

  if (isMine) {
    return (
      <div className={styles.note}>
        <Quote aria-hidden size={13} className={styles.noteQuote} />
        <button
          type="button"
          className={styles.noteEditTrigger}
          onClick={() => onEditingChange(true)}
        >
          {textNode}
        </button>
      </div>
    );
  }

  const showExpand = pitchNote.length > NOTE_PREVIEW_THRESHOLD;
  return (
    <div className={styles.note}>
      <Quote aria-hidden size={13} className={styles.noteQuote} />
      {textNode}
      {showExpand && (
        <button
          type="button"
          className={styles.noteExpand}
          aria-expanded={expanded}
          aria-label={expanded ? t('movies.details.toggleHide') : t('movies.details.toggleShow')}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp aria-hidden size={14} /> : <ChevronDown aria-hidden size={14} />}
        </button>
      )}
    </div>
  );
}
