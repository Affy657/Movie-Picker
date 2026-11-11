import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import EventPendingBanner from './EventPendingBanner';

describe('EventPendingBanner', () => {
  it('explains the situation to the host without any button, the actions living in the header', () => {
    render(
      <LocaleProvider>
        <EventPendingBanner isHost />
      </LocaleProvider>
    );

    expect(screen.getByRole('status', { name: 'En suspens' })).toHaveTextContent(
      /aucun film n.a été choisi/i
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('tells a guest that the host has not picked the movie yet', () => {
    render(
      <LocaleProvider>
        <EventPendingBanner isHost={false} />
      </LocaleProvider>
    );

    expect(screen.getByRole('status', { name: 'En suspens' })).toHaveTextContent(
      /vous pouvez encore voter/i
    );
  });
});
