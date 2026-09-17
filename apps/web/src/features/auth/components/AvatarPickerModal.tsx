import { useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { BOTTTS_IDS, EMOJI_IDS, avatarUrl } from '@/shared/utils/avatar';
import Modal from '@/shared/components/Modal';
import IconButton from '@/shared/components/IconButton';
import { Tabs } from '@/shared/components/Tabs';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import styles from './AvatarPickerModal.module.css';

type Category = 'bottts' | 'emoji';

const AVATAR_OPTION_PX = 48;

type Props = {
  open: boolean;
  currentAvatarId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export default function AvatarPickerModal({
  open,
  currentAvatarId,
  onSelect,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const reactId = useId();
  const titleId = `avatar-modal-title-${reactId}`;

  const [category, setCategory] = useState<Category>(() =>
    EMOJI_IDS.includes(currentAvatarId as never) ? 'emoji' : 'bottts'
  );
  const ids = category === 'bottts' ? BOTTTS_IDS : EMOJI_IDS;

  return (
    <Modal open={open} onClose={onClose} size="sm" padded ariaLabelledBy={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('auth.account.avatarLabel')}
        </h2>
        <IconButton ariaLabel={t('common.close')} onClick={onClose}>
          <X size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
      </div>

      <Tabs
        idBase={`avatar-category-${reactId}`}
        variant="pill"
        className={styles.tabs}
        ariaLabel={t('auth.account.avatarLabel')}
        active={category}
        onChange={setCategory}
        tabs={[
          { key: 'bottts', label: t('auth.account.avatarCategoryRobots') },
          { key: 'emoji', label: t('auth.account.avatarCategoryEmoji') },
        ]}
      />

      <ChoiceGroup
        value={currentAvatarId}
        onChange={onSelect}
        ariaLabel={t('auth.account.avatarLabel')}
        className={styles.grid}
      >
        {ids.map((id) => {
          const selected = id === currentAvatarId;
          return (
            <ChoiceCard
              key={id}
              value={id}
              layout="tile"
              ariaLabel={t('auth.account.avatarOptionAriaLabel', { name: id })}
            >
              <img
                src={avatarUrl(id)}
                alt=""
                aria-hidden="true"
                width={AVATAR_OPTION_PX}
                height={AVATAR_OPTION_PX}
                loading="lazy"
                decoding="async"
                className={styles.img}
              />
              {selected && <Check size={ICON_SIZE.md} className={styles.check} aria-hidden />}
            </ChoiceCard>
          );
        })}
      </ChoiceGroup>
    </Modal>
  );
}
