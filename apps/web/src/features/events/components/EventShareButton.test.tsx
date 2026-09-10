import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventShareButton from '@/features/events/components/EventShareButton';
import { LocaleProvider } from '@/shared/i18n';

describe('EventShareButton', () => {
  it('reste une icône seule, sans libellé texte, et déclenche onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <LocaleProvider>
        <EventShareButton onClick={onClick} />
      </LocaleProvider>
    );

    const button = screen.getByRole('button', { name: /^partager$/i });
    expect(button).not.toHaveTextContent('Partager');
    expect(button).toHaveAttribute('aria-label', 'Partager');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
