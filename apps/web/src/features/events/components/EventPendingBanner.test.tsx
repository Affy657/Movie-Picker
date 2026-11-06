import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import EventPendingBanner from './EventPendingBanner';

function launchButton() {
  return screen.getByRole('button', { name: 'Lancer la roue' });
}

describe('EventPendingBanner', () => {
  it('lets the host launch the wheel', async () => {
    const onLaunchWheel = vi.fn();
    render(
      <LocaleProvider>
        <EventPendingBanner isHost onLaunchWheel={onLaunchWheel} />
      </LocaleProvider>
    );

    await userEvent.click(launchButton());

    expect(onLaunchWheel).toHaveBeenCalledOnce();
  });

  it('locks the launch button while the draw is on its way', () => {
    render(
      <LocaleProvider>
        <EventPendingBanner isHost launching onLaunchWheel={vi.fn()} />
      </LocaleProvider>
    );

    expect(launchButton()).toBeDisabled();
  });
});
