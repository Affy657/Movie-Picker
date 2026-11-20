import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import ClampedText from './ClampedText';

function stubParagraphHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
}

function renderText() {
  render(
    <LocaleProvider>
      <ClampedText text="Une longue description" lines={2} />
    </LocaleProvider>
  );
}

describe('ClampedText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers no toggle when the text fits in its lines', () => {
    stubParagraphHeights(40, 40);
    renderText();

    expect(screen.getByText('Une longue description')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('unfolds a text cut short, then folds it back', async () => {
    const user = userEvent.setup();
    stubParagraphHeights(120, 40);
    renderText();

    const more = screen.getByRole('button', { name: 'Lire la suite' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);

    expect(screen.getByRole('button', { name: 'Réduire' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
