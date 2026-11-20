import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import LinkButton from '@/shared/components/LinkButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import styles from './ClampedText.module.css';

export default function ClampedText({
  text,
  lines,
  className,
}: Readonly<{ text: string; lines: number; className?: string }>) {
  const { t } = useTranslation();
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <>
      <p
        id={textId}
        ref={textRef}
        className={clsx(className, !expanded && styles.clamped)}
        style={{ '--clamp-lines': lines } as CSSProperties}
      >
        {text}
      </p>
      {overflows || expanded ? (
        <LinkButton
          size="sm"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t('common.readLess') : t('common.readMore')}
          {expanded ? (
            <ChevronUp aria-hidden size={ICON_SIZE.sm} />
          ) : (
            <ChevronDown aria-hidden size={ICON_SIZE.sm} />
          )}
        </LinkButton>
      ) : null}
    </>
  );
}
