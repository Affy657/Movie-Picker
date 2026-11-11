import { BrandMark } from './BrandMark';
import styles from './Brand.module.css';

type BrandLoaderProps = {
  readonly label: string;
};

export function BrandLoader({ label }: BrandLoaderProps) {
  return (
    <output className={styles.loader}>
      <BrandMark animated className={styles.loaderMark} />
      <span className="visually-hidden">{label}</span>
    </output>
  );
}
