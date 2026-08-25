import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import WhatsNewNavChip from '@/app/components/WhatsNewNavChip';

describe('WhatsNewNavChip', () => {
  it('ouvre la modale des nouveautés au clic', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <AppTestProviders>
        <WhatsNewNavChip onOpen={onOpen} />
      </AppTestProviders>
    );

    await user.click(screen.getByRole('button', { name: /voir les nouveautés/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
