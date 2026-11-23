import { useState, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import IconButton from './IconButton';
import { ICON_SIZE } from './iconSize';
import styles from './PasswordInput.module.css';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ className, ...inputProps }: Readonly<PasswordInputProps>) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.wrap}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={clsx('input', styles.input, className)}
      />
      <IconButton
        ariaLabel={t('common.showPassword')}
        aria-pressed={visible}
        aria-controls={inputProps.id}
        className={styles.toggle}
        onClick={() => setVisible((shown) => !shown)}
      >
        {visible ? (
          <EyeOff size={ICON_SIZE.md} aria-hidden />
        ) : (
          <Eye size={ICON_SIZE.md} aria-hidden />
        )}
      </IconButton>
    </div>
  );
}
