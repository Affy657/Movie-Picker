import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import AvatarPickerModal from './AvatarPickerModal';

function renderPicker(currentAvatarId = 'alpha') {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <LocaleProvider>
      <AvatarPickerModal
        open
        currentAvatarId={currentAvatarId}
        onSelect={onSelect}
        onClose={onClose}
      />
    </LocaleProvider>
  );
  return { onSelect, onClose };
}

const avatarRadio = (id: string) => screen.getByRole('radio', { name: `Choisir l’avatar ${id}` });

describe('AvatarPickerModal', () => {
  it('moves the selection with the arrows without saving or closing', async () => {
    const user = userEvent.setup();
    const { onSelect, onClose } = renderPicker('alpha');

    avatarRadio('alpha').focus();
    await user.keyboard('{ArrowRight}');

    expect(avatarRadio('beta')).toHaveFocus();
    expect(avatarRadio('beta')).toHaveAttribute('aria-checked', 'true');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('saves the avatar reached with the arrows once it is activated', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker('alpha');

    avatarRadio('alpha').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('bolt');
  });

  it('saves the clicked avatar', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker('alpha');

    await user.click(avatarRadio('gamma'));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('gamma');
  });

  it('drops the browsed avatar when the dialog is closed without saving', async () => {
    const user = userEvent.setup();
    const { onSelect, onClose } = renderPicker('alpha');

    avatarRadio('alpha').focus();
    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(avatarRadio('alpha')).toHaveAttribute('aria-checked', 'true');
  });
});
