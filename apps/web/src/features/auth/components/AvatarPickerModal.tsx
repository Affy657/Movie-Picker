import { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { BOTTTS_IDS, EMOJI_IDS, avatarUrl } from '@/shared/utils/avatar';
import Modal from '@/shared/components/Modal';
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
  const [browsedAvatarId, setBrowsedAvatarId] = useState<string | null>(null);
  const selectedAvatarId = browsedAvatarId ?? currentAvatarId;

  const close = () => {
    setBrowsedAvatarId(null);
    onClose();
  };

  const commit = (id: string) => {
    setBrowsedAvatarId(null);
    onSelect(id);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={t('auth.account.avatarLabel')}
      titleId={titleId}
    >
      <div className={styles.body}>
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
          value={selectedAvatarId}
          onChange={setBrowsedAvatarId}
          onSelect={commit}
          ariaLabel={t('auth.account.avatarLabel')}
          className={styles.grid}
        >
          {ids.map((id) => {
            const selected = id === selectedAvatarId;
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
      </div>
    </Modal>
  );
}
