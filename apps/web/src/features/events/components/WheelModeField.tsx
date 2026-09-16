import type { WheelMode } from '@/features/events/types';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { useTranslation } from '@/shared/i18n';

type WheelModeFieldProps = {
  value: WheelMode;
  onChange: (mode: WheelMode) => void;
  labelId?: string;
};

export default function WheelModeField({
  value,
  onChange,
  labelId,
}: Readonly<WheelModeFieldProps>) {
  const { t } = useTranslation();

  return (
    <ChoiceGroup value={value} onChange={onChange} ariaLabelledBy={labelId}>
      <ChoiceCard
        value="weightedByVotes"
        indicator
        title={t('events.settings.wheelModeWeightedLabel')}
        description={t('events.settings.wheelModeWeightedDesc')}
      />
      <ChoiceCard
        value="strictRandom"
        indicator
        title={t('events.settings.wheelModeStrictLabel')}
        description={t('events.settings.wheelModeStrictDesc')}
      />
    </ChoiceGroup>
  );
}
