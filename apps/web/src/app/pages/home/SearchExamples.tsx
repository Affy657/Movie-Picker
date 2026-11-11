import LinkButton from '@/shared/components/LinkButton';
import { useTranslation } from '@/shared/i18n';
import { SEARCH_EXAMPLES } from './homeSearch';
import styles from './SearchExamples.module.css';

export default function SearchExamples({ onPick }: Readonly<{ onPick: (term: string) => void }>) {
  const { t } = useTranslation();
  return (
    <p className={styles.examples}>
      <span>{t('home.searchExamplesLabel')}</span>
      {SEARCH_EXAMPLES.map((example) => (
        <LinkButton key={example} size="sm" onClick={() => onPick(example)}>
          {example}
        </LinkButton>
      ))}
    </p>
  );
}
